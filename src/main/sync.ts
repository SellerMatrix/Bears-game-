import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { Category, MessageFull, SyncEvent } from '@shared/types'
import { getAuth } from './accounts'
import { categorize, threadKeyFor } from './categorize'
import {
  clearMailbox, deleteMessage, deleteMessagesByUid, getMailboxState, getMessageRow, getSenderRules,
  insertMessages, localUids, messagesNeedingSnippet, setAccountSyncResult, setBody, setMailboxState,
  setSnippet, toFull, updateFlags, type DB, type NewMessage
} from './db'
import {
  decodeCharset, decodeTransfer, findTextPart, hasAttachments, htmlToText, makeSnippet, parseHeaderBlock,
  type StructureNode, type TextPartRef
} from './mime'
import { getSettings } from './settings'

const INBOX = 'INBOX'
const HEADER_KEYS = ['list-unsubscribe', 'list-id', 'precedence', 'auto-submitted', 'references']

async function connect(db: DB, accountId: number): Promise<ImapFlow> {
  const { row, auth } = await getAuth(db, accountId)
  const client = new ImapFlow({
    host: row.imap_host,
    port: row.imap_port,
    secure: row.imap_port === 993,
    auth: auth.kind === 'oauth'
      ? { user: auth.user, accessToken: auth.accessToken }
      : { user: auth.user, pass: auth.pass },
    logger: false,
    clientInfo: { name: 'My Mail', version: '0.1.0' }
  })
  await client.connect()
  return client
}

/** Run fn with a connected client and INBOX locked, always cleaning up. */
async function withInbox<T>(db: DB, accountId: number, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const client = await connect(db, accountId)
  try {
    const lock = await client.getMailboxLock(INBOX)
    try {
      return await fn(client)
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => client.close())
  }
}

function toNewMessage(accountId: number, m: FetchMessageObject, rules: Map<string, Category>): NewMessage {
  const env = m.envelope ?? {}
  const from = env.from?.[0] ?? {}
  const headers = m.headers ? parseHeaderBlock(m.headers.toString('utf8')) : {}
  const subject = env.subject?.trim() || '(no subject)'
  const fromEmail = (from.address || '').toLowerCase()
  const fromName = from.name || fromEmail
  const textPart = findTextPart(m.bodyStructure as StructureNode | undefined)
  const date = env.date ? new Date(env.date).getTime() : m.internalDate ? new Date(m.internalDate).getTime() : Date.now()
  return {
    accountId,
    mailbox: INBOX,
    uid: m.uid,
    messageId: env.messageId ?? null,
    inReplyTo: env.inReplyTo ?? null,
    threadKey: threadKeyFor(accountId, subject),
    fromName,
    fromEmail,
    to: (env.to ?? []).map((a) => ({ name: a.name || '', address: a.address || '' })),
    cc: (env.cc ?? []).map((a) => ({ name: a.name || '', address: a.address || '' })),
    subject,
    date: Number.isFinite(date) ? date : Date.now(),
    seen: m.flags?.has('\\Seen') ?? false,
    flagged: m.flags?.has('\\Flagged') ?? false,
    category: categorize({ fromEmail, fromName, subject, headers }, rules),
    hasAttachments: hasAttachments(m.bodyStructure as StructureNode | undefined),
    headers,
    textPart: textPart ? JSON.stringify(textPart) : null
  }
}

const running = new Map<number, Promise<number>>()

/** Sync one account's inbox. Concurrent calls for the same account share one run. */
export function syncAccount(db: DB, accountId: number, emit: (e: SyncEvent) => void): Promise<number> {
  const existing = running.get(accountId)
  if (existing) return existing
  const p = doSync(db, accountId, emit).finally(() => running.delete(accountId))
  running.set(accountId, p)
  return p
}

async function doSync(db: DB, accountId: number, emit: (e: SyncEvent) => void): Promise<number> {
  emit({ type: 'sync-start', accountId })
  try {
    const added = await withInbox(db, accountId, async (client) => {
      const box = client.mailbox
      if (!box) throw new Error('Could not open INBOX')
      const uidValidity = String(box.uidValidity)
      const state = getMailboxState(db, accountId, INBOX)
      if (state && state.uid_validity !== uidValidity) clearMailbox(db, accountId, INBOX)
      const lastUid = state && state.uid_validity === uidValidity ? state.last_uid : 0
      const rules = getSenderRules(db)
      const query = { uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true, headers: HEADER_KEYS }

      // 1. New messages (first run: the newest N; afterwards: everything above lastUid)
      const fresh: NewMessage[] = []
      let maxUid = lastUid
      if (box.exists > 0) {
        const limit = getSettings().messagesPerAccount
        const iter = lastUid === 0
          ? client.fetch(`${Math.max(1, box.exists - limit + 1)}:*`, query)
          : client.fetch(`${lastUid + 1}:*`, query, { uid: true })
        for await (const m of iter) {
          if (m.uid <= lastUid) continue // "N:*" always returns the last message
          fresh.push(toNewMessage(accountId, m, rules))
          maxUid = Math.max(maxUid, m.uid)
        }
      }
      const addedCount = insertMessages(db, fresh)
      setMailboxState(db, accountId, INBOX, uidValidity, maxUid)

      // 2. Flags changed elsewhere (read on phone, starred in Gmail web...)
      const known = localUids(db, accountId, INBOX)
      if (known.length) {
        const minUid = Math.min(...known)
        const flags: { uid: number; seen: boolean; flagged: boolean }[] = []
        for await (const m of client.fetch(`${minUid}:*`, { uid: true, flags: true }, { uid: true })) {
          flags.push({ uid: m.uid, seen: m.flags?.has('\\Seen') ?? false, flagged: m.flags?.has('\\Flagged') ?? false })
        }
        updateFlags(db, accountId, INBOX, flags)

        // 3. Messages archived/deleted elsewhere
        const onServer = new Set(flags.map((f) => f.uid))
        const gone = known.filter((uid) => uid >= minUid && !onServer.has(uid))
        if (gone.length) deleteMessagesByUid(db, accountId, INBOX, gone)
      }

      // 4. Preview snippets: fetch only the first few KB of the text part
      await fillSnippets(db, client, accountId)
      return addedCount
    })
    setAccountSyncResult(db, accountId, null)
    emit({ type: 'sync-done', accountId, newMessages: added })
    return added
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setAccountSyncResult(db, accountId, msg)
    emit({ type: 'sync-error', accountId, error: msg })
    return 0
  }
}

async function fillSnippets(db: DB, client: ImapFlow, accountId: number): Promise<void> {
  for (let round = 0; round < 10; round++) {
    const pending = messagesNeedingSnippet(db, accountId, 100)
    if (!pending.length) return
    const byPart = new Map<string, { id: number; uid: number; ref: TextPartRef }[]>()
    for (const p of pending) {
      const ref = JSON.parse(p.text_part) as TextPartRef
      const list = byPart.get(ref.part) ?? []
      list.push({ id: p.id, uid: p.uid, ref })
      byPart.set(ref.part, list)
    }
    for (const [part, items] of byPart) {
      const byUid = new Map(items.map((i) => [i.uid, i]))
      const done = new Set<number>()
      for await (const m of client.fetch(items.map((i) => i.uid).join(','),
        { uid: true, bodyParts: [{ key: part, maxLength: 6144 }] }, { uid: true })) {
        const item = byUid.get(m.uid)
        if (!item) continue
        const raw = m.bodyParts?.get(part) ?? m.bodyParts?.values().next().value
        let snippet = ''
        if (raw) {
          const bytes = m.binaryParts?.has(part) ? raw : decodeTransfer(raw, item.ref.encoding)
          let text = decodeCharset(bytes, item.ref.charset)
          if (item.ref.type === 'text/html') text = htmlToText(text)
          snippet = makeSnippet(text)
        }
        setSnippet(db, item.id, snippet || ' ')
        done.add(m.uid)
      }
      // Never retry forever on messages the server won't return.
      for (const i of items) if (!done.has(i.uid)) setSnippet(db, i.id, ' ')
    }
  }
}

/** Download and parse the full message the first time it's opened. */
export async function getFullMessage(db: DB, id: number): Promise<MessageFull> {
  const row = getMessageRow(db, id)
  if (row.body_fetched) return toFull(row)
  const source = await withInbox(db, row.account_id, async (client) => {
    const m = await client.fetchOne(String(row.uid), { uid: true, source: true }, { uid: true })
    return m ? m.source : undefined
  })
  if (!source) throw new Error('This message no longer exists on the server.')
  const parsed = await simpleParser(source)

  let html = parsed.html || null
  if (html) {
    // Inline images (cid:) become data: URIs so they render without network.
    for (const att of parsed.attachments) {
      if (att.cid && att.contentType.startsWith('image/') && att.size < 3_000_000) {
        const uri = `data:${att.contentType};base64,${att.content.toString('base64')}`
        html = html.split(`cid:${att.cid}`).join(uri)
      }
    }
  }
  const text = parsed.text ?? (html ? htmlToText(html) : '')
  const attachments = parsed.attachments
    .filter((a) => a.contentDisposition === 'attachment' || !a.cid)
    .map((a) => ({ filename: a.filename || 'attachment', size: a.size, contentType: a.contentType }))
  const refs = Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references ?? null
  db.prepare('UPDATE messages SET refs = ? WHERE id = ?').run(refs, id)
  setBody(db, id, html, text, attachments, makeSnippet(text))
  return toFull(getMessageRow(db, id))
}

export async function setSeenRemote(db: DB, id: number, seen: boolean): Promise<void> {
  const row = getMessageRow(db, id)
  await withInbox(db, row.account_id, async (client) => {
    if (seen) await client.messageFlagsAdd(String(row.uid), ['\\Seen'], { uid: true })
    else await client.messageFlagsRemove(String(row.uid), ['\\Seen'], { uid: true })
  })
}

export async function setFlaggedRemote(db: DB, id: number, flagged: boolean): Promise<void> {
  const row = getMessageRow(db, id)
  await withInbox(db, row.account_id, async (client) => {
    if (flagged) await client.messageFlagsAdd(String(row.uid), ['\\Flagged'], { uid: true })
    else await client.messageFlagsRemove(String(row.uid), ['\\Flagged'], { uid: true })
  })
}

/** Archive = move out of the inbox (Gmail "All Mail", Outlook "Archive"). */
export async function moveMessage(db: DB, id: number, to: 'archive' | 'trash'): Promise<void> {
  const row = getMessageRow(db, id)
  await withInbox(db, row.account_id, async (client) => {
    const boxes = await client.list()
    const want = to === 'trash' ? ['\\Trash'] : ['\\Archive', '\\All']
    const target = want.map((w) => boxes.find((b) => b.specialUse === w)).find(Boolean)
      ?? boxes.find((b) => b.name.toLowerCase() === (to === 'trash' ? 'trash' : 'archive'))
    if (!target) throw new Error(`Couldn't find a ${to} folder on this account.`)
    const ok = await client.messageMove(String(row.uid), target.path, { uid: true })
    if (!ok) throw new Error('The server refused to move the message.')
  })
  deleteMessage(db, id)
}
