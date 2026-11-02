import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryCounts, deleteAccount, deleteMessagesByUid, insertAccount, insertMessages, listMessages, openDb,
  setBody, setSenderRule, setSnippet, type NewMessage
} from '../src/main/db.ts'

function setup() {
  const db = openDb(':memory:')
  const accountId = insertAccount(db, {
    provider: 'gmail', email: 'me@gmail.com', name: 'Me', auth_type: 'password', secret: 'x',
    imap_host: 'h', imap_port: 993, smtp_host: 's', smtp_port: 465
  })
  const base: Omit<NewMessage, 'uid' | 'subject' | 'fromEmail' | 'category' | 'date'> = {
    accountId, mailbox: 'INBOX', messageId: null, inReplyTo: null, threadKey: 't', fromName: '',
    to: [], cc: [], seen: false, flagged: false, hasAttachments: false, headers: {}, textPart: null
  }
  insertMessages(db, [
    { ...base, uid: 1, subject: 'Dinner Friday', fromEmail: 'jane@gmail.com', category: 'people', date: 3 },
    { ...base, uid: 2, subject: 'Weekly digest', fromEmail: 'news@substack.com', category: 'newsletters', date: 2 },
    { ...base, uid: 3, subject: 'Your order shipped', fromEmail: 'ship@amazon.com', category: 'receipts', date: 1, seen: true }
  ])
  return { db, accountId }
}

test('lists newest first, filters by category, counts unread', () => {
  const { db } = setup()
  assert.deepEqual(listMessages(db, {}).map((m) => m.subject), ['Dinner Friday', 'Weekly digest', 'Your order shipped'])
  assert.deepEqual(listMessages(db, { category: 'newsletters' }).map((m) => m.uid ?? m.subject), ['Weekly digest'])
  assert.deepEqual(categoryCounts(db), { all: 2, people: 1, newsletters: 1, receipts: 0, notifications: 0 })
})

test('re-inserting the same uid is ignored', () => {
  const { db, accountId } = setup()
  const added = insertMessages(db, [{
    accountId, mailbox: 'INBOX', uid: 1, messageId: null, inReplyTo: null, threadKey: 't', fromName: '', fromEmail: 'x@y.z',
    to: [], cc: [], subject: 'dup', date: 9, seen: false, flagged: false, category: 'people', hasAttachments: false, headers: {}, textPart: null
  }])
  assert.equal(added, 0)
})

test('full-text search covers subject, snippet and body, and stays in sync', () => {
  const { db } = setup()
  assert.equal(listMessages(db, { search: 'dinn' }).length, 1)
  const id = listMessages(db, { search: 'digest' })[0].id
  setSnippet(db, id, 'Top stories about penguins')
  assert.equal(listMessages(db, { search: 'penguins' }).length, 1)
  setBody(db, id, null, 'Full body mentions walruses', [], 'x')
  assert.equal(listMessages(db, { search: 'walruses' }).length, 1)
  assert.equal(listMessages(db, { search: 'penguins' }).length, 1)
  deleteMessagesByUid(db, listMessages(db, {})[0].accountId, 'INBOX', [2])
  assert.equal(listMessages(db, { search: 'walruses' }).length, 0)
  assert.equal(listMessages(db, { search: 'quote"s (weird' }).length, 0) // no FTS syntax errors
})

test('sender rules re-file existing mail by address or domain', () => {
  const { db } = setup()
  assert.equal(setSenderRule(db, 'news@substack.com', 'people'), 1)
  assert.equal(listMessages(db, { category: 'people' }).length, 2)
  assert.equal(setSenderRule(db, '@amazon.com', 'notifications'), 1)
  assert.equal(listMessages(db, { category: 'notifications' })[0].fromEmail, 'ship@amazon.com')
})

test('deleting an account removes its mail', () => {
  const { db, accountId } = setup()
  deleteAccount(db, accountId)
  assert.equal(listMessages(db, {}).length, 0)
  assert.equal(listMessages(db, { search: 'dinner' }).length, 0)
})
