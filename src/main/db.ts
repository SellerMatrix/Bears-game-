import Database from 'better-sqlite3'
import type {
  Account, Address, Category, CategoryCounts, ListQuery, MessageFull, MessageSummary, Provider
} from '../shared/types'

// Local SQLite cache of every account's mail. The server stays the source of
// truth; this database is what makes the UI instant and searchable offline.

export type DB = Database.Database

export function openDb(file: string): DB {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      auth_type TEXT NOT NULL,            -- 'oauth' | 'password'
      secret TEXT NOT NULL,               -- encrypted refresh token or password
      imap_host TEXT NOT NULL, imap_port INTEGER NOT NULL,
      smtp_host TEXT NOT NULL, smtp_port INTEGER NOT NULL,
      last_sync_at INTEGER, last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS mailbox_state (
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      mailbox TEXT NOT NULL,
      uid_validity TEXT NOT NULL,
      last_uid INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (account_id, mailbox)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      mailbox TEXT NOT NULL,
      uid INTEGER NOT NULL,
      message_id TEXT, in_reply_to TEXT, refs TEXT,
      thread_key TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT '', from_email TEXT NOT NULL DEFAULT '',
      to_json TEXT NOT NULL DEFAULT '[]', cc_json TEXT NOT NULL DEFAULT '[]',
      subject TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL,
      snippet TEXT NOT NULL DEFAULT '',
      seen INTEGER NOT NULL DEFAULT 0, flagged INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      has_attachments INTEGER NOT NULL DEFAULT 0,
      headers_json TEXT NOT NULL DEFAULT '{}',
      text_part TEXT,                    -- IMAP part id used for the snippet
      body_html TEXT, body_text TEXT, attachments_json TEXT,
      body_fetched INTEGER NOT NULL DEFAULT 0,
      UNIQUE (account_id, mailbox, uid)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_cat ON messages(category, date DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_key);

    -- "Always put this sender in X" overrides. Key is an email or '@domain'.
    CREATE TABLE IF NOT EXISTS sender_rules (
      sender TEXT PRIMARY KEY,
      category TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      subject, from_name, from_email, snippet, body,
      content='', tokenize='unicode61'
    );
  `)
}

// ---------- accounts ----------

export interface AccountRow {
  id: number
  provider: Provider
  email: string
  name: string
  color: string
  auth_type: 'oauth' | 'password'
  secret: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  last_sync_at: number | null
  last_error: string | null
}

const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0ca678', '#d6336c']

export function insertAccount(db: DB, a: Omit<AccountRow, 'id' | 'color' | 'last_sync_at' | 'last_error'>): number {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }).n
  const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(a.email) as { id: number } | undefined
  if (existing) {
    db.prepare(`UPDATE accounts SET provider=@provider, name=@name, auth_type=@auth_type, secret=@secret,
      imap_host=@imap_host, imap_port=@imap_port, smtp_host=@smtp_host, smtp_port=@smtp_port,
      last_error=NULL WHERE id=@id`).run({ ...a, id: existing.id })
    return existing.id
  }
  const info = db.prepare(`INSERT INTO accounts
    (provider, email, name, color, auth_type, secret, imap_host, imap_port, smtp_host, smtp_port)
    VALUES (@provider, @email, @name, @color, @auth_type, @secret, @imap_host, @imap_port, @smtp_host, @smtp_port)`)
    .run({ ...a, color: COLORS[count % COLORS.length] })
  return Number(info.lastInsertRowid)
}

export function getAccountRow(db: DB, id: number): AccountRow {
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
  if (!row) throw new Error(`Account ${id} not found`)
  return row
}

export function listAccountRows(db: DB): AccountRow[] {
  return db.prepare('SELECT * FROM accounts ORDER BY id').all() as AccountRow[]
}

export function toAccount(r: AccountRow): Account {
  return {
    id: r.id, provider: r.provider, email: r.email, name: r.name, color: r.color,
    lastSyncAt: r.last_sync_at, lastError: r.last_error
  }
}

export function updateAccountSecret(db: DB, id: number, secret: string): void {
  db.prepare('UPDATE accounts SET secret = ? WHERE id = ?').run(secret, id)
}

export function setAccountSyncResult(db: DB, id: number, error: string | null): void {
  db.prepare('UPDATE accounts SET last_sync_at = ?, last_error = ? WHERE id = ?').run(Date.now(), error, id)
}

export function deleteAccount(db: DB, id: number): void {
  const tx = db.transaction(() => {
    const ids = db.prepare('SELECT id FROM messages WHERE account_id = ?').all(id) as { id: number }[]
    const delFts = db.prepare("INSERT INTO messages_fts(messages_fts, rowid, subject, from_name, from_email, snippet, body) SELECT 'delete', id, subject, from_name, from_email, snippet, COALESCE(body_text,'') FROM messages WHERE id = ?")
    for (const { id: mid } of ids) delFts.run(mid)
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  })
  tx()
}

// ---------- mailbox state ----------

export function getMailboxState(db: DB, accountId: number, mailbox: string): { uid_validity: string; last_uid: number } | undefined {
  return db.prepare('SELECT uid_validity, last_uid FROM mailbox_state WHERE account_id = ? AND mailbox = ?')
    .get(accountId, mailbox) as { uid_validity: string; last_uid: number } | undefined
}

export function setMailboxState(db: DB, accountId: number, mailbox: string, uidValidity: string, lastUid: number): void {
  db.prepare(`INSERT INTO mailbox_state (account_id, mailbox, uid_validity, last_uid) VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, mailbox) DO UPDATE SET uid_validity = excluded.uid_validity, last_uid = excluded.last_uid`)
    .run(accountId, mailbox, uidValidity, lastUid)
}

// ---------- messages ----------

export interface NewMessage {
  accountId: number
  mailbox: string
  uid: number
  messageId: string | null
  inReplyTo: string | null
  threadKey: string
  fromName: string
  fromEmail: string
  to: Address[]
  cc: Address[]
  subject: string
  date: number
  seen: boolean
  flagged: boolean
  category: Category
  hasAttachments: boolean
  headers: Record<string, string>
  textPart: string | null
}

export function insertMessages(db: DB, msgs: NewMessage[]): number {
  const ins = db.prepare(`INSERT OR IGNORE INTO messages
    (account_id, mailbox, uid, message_id, in_reply_to, thread_key, from_name, from_email, to_json, cc_json,
     subject, date, seen, flagged, category, has_attachments, headers_json, text_part)
    VALUES (@accountId, @mailbox, @uid, @messageId, @inReplyTo, @threadKey, @fromName, @fromEmail, @toJson, @ccJson,
     @subject, @date, @seen, @flagged, @category, @hasAttachments, @headersJson, @textPart)`)
  const fts = db.prepare('INSERT INTO messages_fts(rowid, subject, from_name, from_email, snippet, body) VALUES (?, ?, ?, ?, ?, ?)')
  let added = 0
  db.transaction(() => {
    for (const m of msgs) {
      const info = ins.run({
        ...m,
        toJson: JSON.stringify(m.to), ccJson: JSON.stringify(m.cc),
        seen: m.seen ? 1 : 0, flagged: m.flagged ? 1 : 0, hasAttachments: m.hasAttachments ? 1 : 0,
        headersJson: JSON.stringify(m.headers)
      })
      if (info.changes) {
        added++
        fts.run(Number(info.lastInsertRowid), m.subject, m.fromName, m.fromEmail, '', '')
      }
    }
  })()
  return added
}

/** Re-index a message in full-text search after its snippet/body changes. */
function reindex(db: DB, id: number, before: { subject: string; from_name: string; from_email: string; snippet: string; body_text: string | null }): void {
  db.prepare("INSERT INTO messages_fts(messages_fts, rowid, subject, from_name, from_email, snippet, body) VALUES ('delete', ?, ?, ?, ?, ?, ?)")
    .run(id, before.subject, before.from_name, before.from_email, before.snippet, before.body_text ?? '')
  const after = db.prepare('SELECT subject, from_name, from_email, snippet, body_text FROM messages WHERE id = ?').get(id) as typeof before
  db.prepare('INSERT INTO messages_fts(rowid, subject, from_name, from_email, snippet, body) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, after.subject, after.from_name, after.from_email, after.snippet, after.body_text ?? '')
}

function ftsSnapshot(db: DB, id: number) {
  return db.prepare('SELECT subject, from_name, from_email, snippet, body_text FROM messages WHERE id = ?').get(id) as
    { subject: string; from_name: string; from_email: string; snippet: string; body_text: string | null }
}

export function setSnippet(db: DB, id: number, snippet: string): void {
  db.transaction(() => {
    const before = ftsSnapshot(db, id)
    db.prepare('UPDATE messages SET snippet = ? WHERE id = ?').run(snippet, id)
    reindex(db, id, before)
  })()
}

export function setBody(db: DB, id: number, html: string | null, text: string | null, attachments: unknown[], snippet: string): void {
  db.transaction(() => {
    const before = ftsSnapshot(db, id)
    db.prepare(`UPDATE messages SET body_html = ?, body_text = ?, attachments_json = ?, body_fetched = 1,
      snippet = CASE WHEN snippet = '' THEN ? ELSE snippet END WHERE id = ?`)
      .run(html, text, JSON.stringify(attachments), snippet, id)
    reindex(db, id, before)
  })()
}

export function messagesNeedingSnippet(db: DB, accountId: number, limit: number): { id: number; uid: number; mailbox: string; text_part: string }[] {
  return db.prepare(`SELECT id, uid, mailbox, text_part FROM messages
    WHERE account_id = ? AND snippet = '' AND text_part IS NOT NULL AND body_fetched = 0
    ORDER BY date DESC LIMIT ?`).all(accountId, limit) as { id: number; uid: number; mailbox: string; text_part: string }[]
}

export function updateFlags(db: DB, accountId: number, mailbox: string, flags: { uid: number; seen: boolean; flagged: boolean }[]): void {
  const st = db.prepare('UPDATE messages SET seen = ?, flagged = ? WHERE account_id = ? AND mailbox = ? AND uid = ?')
  db.transaction(() => {
    for (const f of flags) st.run(f.seen ? 1 : 0, f.flagged ? 1 : 0, accountId, mailbox, f.uid)
  })()
}

export function localUids(db: DB, accountId: number, mailbox: string): number[] {
  return (db.prepare('SELECT uid FROM messages WHERE account_id = ? AND mailbox = ?').all(accountId, mailbox) as { uid: number }[])
    .map((r) => r.uid)
}

export function deleteMessagesByUid(db: DB, accountId: number, mailbox: string, uids: number[]): void {
  const find = db.prepare('SELECT id FROM messages WHERE account_id = ? AND mailbox = ? AND uid = ?')
  db.transaction(() => {
    for (const uid of uids) {
      const row = find.get(accountId, mailbox, uid) as { id: number } | undefined
      if (row) deleteMessage(db, row.id)
    }
  })()
}

export function deleteMessage(db: DB, id: number): void {
  const before = ftsSnapshot(db, id)
  if (!before) return
  db.prepare("INSERT INTO messages_fts(messages_fts, rowid, subject, from_name, from_email, snippet, body) VALUES ('delete', ?, ?, ?, ?, ?, ?)")
    .run(id, before.subject, before.from_name, before.from_email, before.snippet, before.body_text ?? '')
  db.prepare('DELETE FROM messages WHERE id = ?').run(id)
}

export function clearMailbox(db: DB, accountId: number, mailbox: string): void {
  deleteMessagesByUid(db, accountId, mailbox, localUids(db, accountId, mailbox))
}

interface MessageRow {
  id: number; account_id: number; mailbox: string; uid: number
  message_id: string | null; in_reply_to: string | null; refs: string | null; thread_key: string
  from_name: string; from_email: string; to_json: string; cc_json: string; subject: string
  date: number; snippet: string; seen: number; flagged: number; category: Category
  has_attachments: number; headers_json: string; text_part: string | null
  body_html: string | null; body_text: string | null; attachments_json: string | null; body_fetched: number
}

function toSummary(r: MessageRow): MessageSummary {
  return {
    id: r.id, accountId: r.account_id, fromName: r.from_name, fromEmail: r.from_email,
    subject: r.subject, snippet: r.snippet, date: r.date, seen: !!r.seen, flagged: !!r.flagged,
    category: r.category, hasAttachments: !!r.has_attachments, threadKey: r.thread_key
  }
}

export function getMessageRow(db: DB, id: number): MessageRow {
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined
  if (!row) throw new Error(`Message ${id} not found`)
  return row
}

export function toFull(r: MessageRow): MessageFull {
  return {
    ...toSummary(r),
    to: JSON.parse(r.to_json), cc: JSON.parse(r.cc_json),
    messageId: r.message_id, references: r.refs,
    html: r.body_html, text: r.body_text,
    attachments: r.attachments_json ? JSON.parse(r.attachments_json) : []
  }
}

function ftsQuery(search: string): string {
  // Turn free text into a safe prefix query: "amazon ord" -> "amazon"* "ord"*
  return search
    .split(/\s+/)
    .map((t) => t.replace(/"/g, ''))
    .filter(Boolean)
    .map((t) => `"${t}"*`)
    .join(' ')
}

export function listMessages(db: DB, q: ListQuery): MessageSummary[] {
  const where: string[] = []
  const params: Record<string, unknown> = { limit: q.limit ?? 200, offset: q.offset ?? 0 }
  if (q.accountId) { where.push('m.account_id = @accountId'); params.accountId = q.accountId }
  if (q.category && q.category !== 'all') { where.push('m.category = @category'); params.category = q.category }
  let from = 'messages m'
  const fq = q.search ? ftsQuery(q.search) : ''
  if (fq) {
    from = 'messages m JOIN messages_fts f ON f.rowid = m.id'
    where.push('messages_fts MATCH @fts')
    params.fts = fq
  }
  const sql = `SELECT m.* FROM ${from} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.date DESC LIMIT @limit OFFSET @offset`
  return (db.prepare(sql).all(params) as MessageRow[]).map(toSummary)
}

export function threadMessages(db: DB, id: number): MessageRow[] {
  const row = getMessageRow(db, id)
  return db.prepare('SELECT * FROM messages WHERE thread_key = ? ORDER BY date ASC LIMIT 25').all(row.thread_key) as MessageRow[]
}

export function categoryCounts(db: DB, accountId?: number | null): CategoryCounts {
  const rows = db.prepare(`SELECT category, COUNT(*) AS n FROM messages
    WHERE seen = 0 ${accountId ? 'AND account_id = @accountId' : ''} GROUP BY category`)
    .all(accountId ? { accountId } : {}) as { category: Category; n: number }[]
  const out: CategoryCounts = { all: 0, people: 0, newsletters: 0, receipts: 0, notifications: 0 }
  for (const r of rows) { out[r.category] = r.n; out.all += r.n }
  return out
}

export function setSeen(db: DB, id: number, seen: boolean): void {
  db.prepare('UPDATE messages SET seen = ? WHERE id = ?').run(seen ? 1 : 0, id)
}

export function setFlagged(db: DB, id: number, flagged: boolean): void {
  db.prepare('UPDATE messages SET flagged = ? WHERE id = ?').run(flagged ? 1 : 0, id)
}

// ---------- sender rules ----------

export function getSenderRules(db: DB): Map<string, Category> {
  const rows = db.prepare('SELECT sender, category FROM sender_rules').all() as { sender: string; category: Category }[]
  return new Map(rows.map((r) => [r.sender, r.category]))
}

/** Remember a sender's category and re-file all their existing mail. */
export function setSenderRule(db: DB, sender: string, category: Category): number {
  const key = sender.toLowerCase()
  db.prepare(`INSERT INTO sender_rules (sender, category) VALUES (?, ?)
    ON CONFLICT(sender) DO UPDATE SET category = excluded.category`).run(key, category)
  const info = key.startsWith('@')
    ? db.prepare("UPDATE messages SET category = ? WHERE lower(from_email) LIKE '%' || ?").run(category, key)
    : db.prepare('UPDATE messages SET category = ? WHERE lower(from_email) = ?').run(category, key)
  return info.changes
}
