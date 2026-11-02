// Types shared by the main process, preload bridge and React UI.

export type Provider = 'gmail' | 'outlook' | 'imap'

/** Smart-inbox buckets. Similar idea to Hey's Imbox / The Feed / Paper Trail. */
export type Category = 'people' | 'newsletters' | 'receipts' | 'notifications'

export const CATEGORIES: { id: Category; label: string; hint: string }[] = [
  { id: 'people', label: 'People', hint: 'Mail from real humans' },
  { id: 'newsletters', label: 'Newsletters', hint: 'Mailing lists and marketing' },
  { id: 'receipts', label: 'Receipts', hint: 'Orders, invoices, bookings' },
  { id: 'notifications', label: 'Notifications', hint: 'Automated alerts' }
]

export interface Account {
  id: number
  provider: Provider
  email: string
  name: string
  color: string
  lastSyncAt: number | null
  lastError: string | null
}

export interface Address {
  name: string
  address: string
}

export interface MessageSummary {
  id: number
  accountId: number
  fromName: string
  fromEmail: string
  subject: string
  snippet: string
  date: number
  seen: boolean
  flagged: boolean
  category: Category
  hasAttachments: boolean
  threadKey: string
}

export interface MessageFull extends MessageSummary {
  to: Address[]
  cc: Address[]
  messageId: string | null
  references: string | null
  html: string | null
  text: string | null
  attachments: { filename: string; size: number; contentType: string }[]
}

export interface ListQuery {
  accountId?: number | null
  category?: Category | 'all'
  search?: string
  limit?: number
  offset?: number
}

export interface CategoryCounts {
  all: number
  people: number
  newsletters: number
  receipts: number
  notifications: number
}

export interface Settings {
  googleClientId: string
  googleClientSecret: string
  microsoftClientId: string
  anthropicApiKey: string
  aiModel: string
  loadRemoteImages: boolean
  syncIntervalMinutes: number
  messagesPerAccount: number
}

export const DEFAULT_SETTINGS: Settings = {
  googleClientId: '',
  googleClientSecret: '',
  microsoftClientId: '',
  anthropicApiKey: '',
  aiModel: 'claude-opus-5-5',
  loadRemoteImages: false,
  syncIntervalMinutes: 2,
  messagesPerAccount: 500
}

export interface PasswordAccountInput {
  email: string
  name: string
  password: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
}

export interface SendInput {
  accountId: number
  to: string
  cc?: string
  subject: string
  body: string
  inReplyToId?: number | null
}

export type SyncEvent =
  | { type: 'sync-start'; accountId: number }
  | { type: 'sync-done'; accountId: number; newMessages: number }
  | { type: 'sync-error'; accountId: number; error: string }

export type AiEvent =
  | { requestId: string; type: 'delta'; text: string }
  | { requestId: string; type: 'done' }
  | { requestId: string; type: 'error'; error: string }
