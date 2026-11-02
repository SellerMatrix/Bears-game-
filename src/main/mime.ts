// Small MIME helpers for building inbox snippets without downloading whole
// messages. Full messages are parsed with mailparser when opened.

export interface StructureNode {
  part?: string
  type: string
  parameters?: Record<string, string>
  encoding?: string
  disposition?: string
  dispositionParameters?: Record<string, string>
  childNodes?: StructureNode[]
}

export interface TextPartRef {
  part: string
  type: 'text/plain' | 'text/html'
  encoding: string
  charset: string
}

/** Find the best part for a preview: text/plain first, then text/html. */
export function findTextPart(node: StructureNode | undefined): TextPartRef | null {
  if (!node) return null
  let html: TextPartRef | null = null
  const walk = (n: StructureNode): TextPartRef | null => {
    const type = n.type?.toLowerCase()
    const isAttachment = n.disposition?.toLowerCase() === 'attachment'
    if (!isAttachment && (type === 'text/plain' || type === 'text/html')) {
      const ref: TextPartRef = {
        part: n.part || '1',
        type,
        encoding: (n.encoding || '7bit').toLowerCase(),
        charset: (n.parameters?.charset || 'utf-8').toLowerCase()
      }
      if (type === 'text/plain') return ref
      html ??= ref
    }
    for (const c of n.childNodes ?? []) {
      const found = walk(c)
      if (found) return found
    }
    return null
  }
  return walk(node) ?? html
}

export function hasAttachments(node: StructureNode | undefined): boolean {
  if (!node) return false
  if (node.disposition?.toLowerCase() === 'attachment') return true
  return (node.childNodes ?? []).some(hasAttachments)
}

export function decodeTransfer(buf: Buffer, encoding: string): Buffer {
  if (encoding === 'base64') {
    const clean = buf.toString('latin1').replace(/[^A-Za-z0-9+/=]/g, '')
    return Buffer.from(clean.slice(0, clean.length - (clean.length % 4)), 'base64')
  }
  if (encoding === 'quoted-printable') {
    const s = buf.toString('latin1').replace(/=\r?\n/g, '')
    const out: number[] = []
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
        out.push(parseInt(s.slice(i + 1, i + 3), 16))
        i += 2
      } else {
        out.push(s.charCodeAt(i) & 0xff)
      }
    }
    return Buffer.from(out)
  }
  return buf
}

export function decodeCharset(buf: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(buf)
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf)
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

/** One-line preview: drop quoted replies, signatures and whitespace runs. */
export function makeSnippet(text: string, max = 180): string {
  const lines = text.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    const l = line.trim()
    if (/^On .+wrote:$/.test(l) || l === '--' || l === '-- ') break
    if (l.startsWith('>')) continue
    kept.push(l)
  }
  const s = kept.join(' ').replace(/[​-‍­͏﻿]/g, '').replace(/\s+/g, ' ').trim()
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

/** Parse a raw header block into lowercase-name -> unfolded value. */
export function parseHeaderBlock(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const unfolded = raw.replace(/\r?\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i).trim().toLowerCase()
    out[key] = line.slice(i + 1).trim()
  }
  return out
}
