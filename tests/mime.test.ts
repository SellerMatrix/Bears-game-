import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeCharset, decodeTransfer, findTextPart, hasAttachments, htmlToText, makeSnippet, parseHeaderBlock } from '../src/main/mime.ts'

test('prefers text/plain inside multipart/alternative', () => {
  const tree = {
    type: 'multipart/mixed',
    childNodes: [
      { type: 'multipart/alternative', part: '1', childNodes: [
        { type: 'text/html', part: '1.2', encoding: 'base64', parameters: { charset: 'UTF-8' } },
        { type: 'text/plain', part: '1.1', encoding: 'quoted-printable', parameters: { charset: 'iso-8859-1' } }
      ] },
      { type: 'application/pdf', part: '2', disposition: 'attachment' }
    ]
  }
  assert.deepEqual(findTextPart(tree), { part: '1.1', type: 'text/plain', encoding: 'quoted-printable', charset: 'iso-8859-1' })
  assert.equal(hasAttachments(tree), true)
})

test('falls back to html; single-part messages use part 1', () => {
  assert.equal(findTextPart({ type: 'text/html' })?.part, '1')
  assert.equal(findTextPart({ type: 'image/png' }), null)
})

test('decodes quoted-printable and base64, including truncated base64', () => {
  assert.equal(decodeCharset(decodeTransfer(Buffer.from('Caf=C3=A9 =\r\nau lait'), 'quoted-printable'), 'utf-8'), 'Café au lait')
  const b64 = Buffer.from('Hello wonderful world').toString('base64')
  assert.equal(decodeTransfer(Buffer.from(b64), 'base64').toString(), 'Hello wonderful world')
  assert.ok(decodeTransfer(Buffer.from(b64.slice(0, 13)), 'base64').toString().startsWith('Hello won'))
  assert.equal(decodeCharset(Buffer.from([0x43, 0x61, 0x66, 0xe9]), 'iso-8859-1'), 'Café')
})

test('snippets skip quotes, signatures and html noise', () => {
  const text = 'Hi Sam,\n\nSounds   good — see you at 7.\n\n> old quoted line\nOn Tue, Jan 2, 2026 at 9:00 Bob wrote:\n> more'
  assert.equal(makeSnippet(text), 'Hi Sam, Sounds good — see you at 7.')
  assert.equal(makeSnippet(htmlToText('<style>p{}</style><p>Hello&nbsp;<b>there</b></p><p>Bye &amp; thanks</p>')), 'Hello there Bye & thanks')
  assert.ok(makeSnippet('x'.repeat(500)).length <= 180)
})

test('parses folded headers', () => {
  const h = parseHeaderBlock('List-Unsubscribe: <mailto:a@b.c>,\r\n <https://x.y/u>\r\nPrecedence: bulk\r\n\r\n')
  assert.equal(h['list-unsubscribe'], '<mailto:a@b.c>, <https://x.y/u>')
  assert.equal(h.precedence, 'bulk')
})
