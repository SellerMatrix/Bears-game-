import type { Category } from '../shared/types'

// Rule-based smart inbox. Fast, free, private, and right most of the time.
// Users can override any sender, and the override always wins.

export interface CategorizeInput {
  fromEmail: string
  fromName: string
  subject: string
  headers: Record<string, string>
}

const RECEIPT_RE =
  /\b(receipt|invoice|order (confirm|#|number|no\.?)|your order|order has (shipped|been)|has shipped|out for delivery|delivered|booking (confirm|reference)|reservation|payment (received|confirm)|purchase|statement is ready|billing|subscription (renew|confirm)|e-?ticket|itinerary|trip with)\b/i

const AUTOMATED_LOCAL_RE =
  /^(no-?reply|do-?not-?reply|notifications?|notify|alerts?|mailer-daemon|postmaster|bounce[s]?|automated|system|info|updates?|security|account|accounts|support|hello|team|news)([+._-].*)?$/i

const NOTIFICATION_DOMAINS = [
  'github.com', 'gitlab.com', 'atlassian.net', 'slack.com', 'linear.app',
  'google.com', 'accounts.google.com', 'microsoft.com', 'apple.com',
  'facebookmail.com', 'linkedin.com', 'twitter.com', 'x.com'
]

export function domainOf(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

function isNotificationDomain(domain: string): boolean {
  return NOTIFICATION_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))
}

export function categorize(
  msg: CategorizeInput,
  overrides: Map<string, Category> = new Map()
): Category {
  const email = msg.fromEmail.toLowerCase()
  const domain = domainOf(email)

  const override = overrides.get(email) ?? overrides.get('@' + domain)
  if (override) return override

  const h = msg.headers
  const isList = Boolean(h['list-unsubscribe'] || h['list-id'])
  const precedence = (h['precedence'] || '').toLowerCase()
  const isBulk = precedence === 'bulk' || precedence === 'list' || precedence === 'junk'
  const autoSubmitted = (h['auto-submitted'] || 'no').toLowerCase() !== 'no'
  const automatedSender = AUTOMATED_LOCAL_RE.test(email.split('@')[0] ?? '')

  if (RECEIPT_RE.test(msg.subject)) return 'receipts'
  if (autoSubmitted || (automatedSender && isNotificationDomain(domain))) return 'notifications'
  if (isList || isBulk) return 'newsletters'
  if (automatedSender) return 'notifications'
  return 'people'
}

/** Thread grouping key: subject with Re:/Fwd: stripped, per account. */
export function threadKeyFor(accountId: number, subject: string): string {
  const base = subject
    .replace(/^\s*((re|fw|fwd|aw|wg|sv|vs)(\[\d+\])?\s*:\s*)+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return `${accountId}:${base}`
}
