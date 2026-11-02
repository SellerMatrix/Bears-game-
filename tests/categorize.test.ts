import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categorize, threadKeyFor } from '../src/main/categorize.ts'

const msg = (fromEmail: string, subject: string, headers: Record<string, string> = {}, fromName = '') =>
  ({ fromEmail, fromName, subject, headers })

test('real people land in People', () => {
  assert.equal(categorize(msg('jane.doe@gmail.com', 'Dinner on Friday?')), 'people')
  assert.equal(categorize(msg('bob@acme.co', 'Re: contract draft')), 'people')
})

test('receipts are detected from the subject', () => {
  assert.equal(categorize(msg('auto-confirm@amazon.co.uk', 'Your Amazon.co.uk order #204-1234 has shipped')), 'receipts')
  assert.equal(categorize(msg('no-reply@uber.com', 'Your Tuesday evening trip receipt', { 'list-unsubscribe': '<x>' })), 'receipts')
  assert.equal(categorize(msg('billing@stripe.com', 'Invoice 0042 from Acme')), 'receipts')
})

test('mailing lists are newsletters', () => {
  assert.equal(categorize(msg('newsletter@substack.com', 'This week in AI', { 'list-unsubscribe': '<mailto:x>' })), 'newsletters')
  assert.equal(categorize(msg('deals@shop.com', '50% off today', { precedence: 'bulk' })), 'newsletters')
})

test('automated senders are notifications', () => {
  assert.equal(categorize(msg('notifications@github.com', '[repo] PR #12 merged', { 'list-id': 'repo.github.com' })), 'notifications')
  assert.equal(categorize(msg('no-reply@accounts.google.com', 'Security alert')), 'notifications')
  assert.equal(categorize(msg('someone@corp.com', 'Out of office', { 'auto-submitted': 'auto-replied' })), 'notifications')
})

test('sender and domain overrides always win', () => {
  const rules = new Map([['newsletter@substack.com', 'people' as const], ['@github.com', 'newsletters' as const]])
  assert.equal(categorize(msg('newsletter@substack.com', 'Hi', { 'list-unsubscribe': '<x>' }), rules), 'people')
  assert.equal(categorize(msg('notifications@github.com', 'Your order receipt'), rules), 'newsletters')
})

test('thread keys ignore Re:/Fwd: prefixes and case', () => {
  assert.equal(threadKeyFor(1, 'Re: RE: Fwd:  Lunch plans'), threadKeyFor(1, 'lunch plans'))
  assert.notEqual(threadKeyFor(1, 'Lunch'), threadKeyFor(2, 'Lunch'))
})
