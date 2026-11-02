import type { PasswordAccountInput, Provider } from '@shared/types'
import { getAccountRow, insertAccount, updateAccountSecret, type AccountRow, type DB } from './db'
import { GOOGLE, MICROSOFT, authorize, refresh, type OAuthProviderConfig } from './oauth'
import { decryptSecret, encryptSecret } from './secrets'
import { getSettings } from './settings'

const SERVERS: Record<Exclude<Provider, 'imap'>, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail: { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 465 },
  outlook: { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp-mail.outlook.com', smtp_port: 587 }
}

function oauthConfig(provider: 'gmail' | 'outlook'): OAuthProviderConfig {
  const s = getSettings()
  if (provider === 'gmail') {
    if (!s.googleClientId) throw new Error('Add your Google OAuth Client ID in Settings first.')
    return { ...GOOGLE, clientId: s.googleClientId, clientSecret: s.googleClientSecret || undefined }
  }
  if (!s.microsoftClientId) throw new Error('Add your Microsoft (Azure) Application ID in Settings first.')
  return { ...MICROSOFT, clientId: s.microsoftClientId }
}

export async function addOAuthAccount(db: DB, provider: 'gmail' | 'outlook'): Promise<number> {
  const tokens = await authorize(oauthConfig(provider))
  const claims = tokens.idTokenClaims
  const email = String(claims.email || claims.preferred_username || '').toLowerCase()
  if (!email) throw new Error('Signed in, but the provider did not return an email address.')
  if (!tokens.refreshToken) throw new Error('The provider did not return a refresh token. Try again.')
  const id = insertAccount(db, {
    provider,
    email,
    name: String(claims.name || ''),
    auth_type: 'oauth',
    secret: encryptSecret(tokens.refreshToken),
    ...SERVERS[provider]
  })
  accessCache.set(id, { token: tokens.accessToken, expiresAt: tokens.expiresAt })
  return id
}

export function addPasswordAccount(db: DB, input: PasswordAccountInput): number {
  const email = input.email.trim().toLowerCase()
  const provider: Provider = email.endsWith('@gmail.com') || email.endsWith('@googlemail.com') ? 'gmail' : 'imap'
  return insertAccount(db, {
    provider,
    email,
    name: input.name.trim(),
    auth_type: 'password',
    secret: encryptSecret(input.password),
    imap_host: input.imapHost.trim(),
    imap_port: input.imapPort,
    smtp_host: input.smtpHost.trim(),
    smtp_port: input.smtpPort
  })
}

/** Known IMAP/SMTP settings so password accounts are one field to fill. */
export const PRESETS: Record<string, Omit<PasswordAccountInput, 'email' | 'name' | 'password'>> = {
  'gmail.com': { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 },
  'yahoo.com': { imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465 },
  'icloud.com': { imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  'me.com': { imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  'aol.com': { imapHost: 'imap.aol.com', imapPort: 993, smtpHost: 'smtp.aol.com', smtpPort: 465 },
  'fastmail.com': { imapHost: 'imap.fastmail.com', imapPort: 993, smtpHost: 'smtp.fastmail.com', smtpPort: 465 },
  'zoho.com': { imapHost: 'imap.zoho.com', imapPort: 993, smtpHost: 'smtp.zoho.com', smtpPort: 465 }
}

const accessCache = new Map<number, { token: string; expiresAt: number }>()

export type MailAuth =
  | { kind: 'oauth'; user: string; accessToken: string }
  | { kind: 'password'; user: string; pass: string }

/** Credentials for IMAP/SMTP, refreshing the OAuth access token when needed. */
export async function getAuth(db: DB, accountId: number): Promise<{ row: AccountRow; auth: MailAuth }> {
  const row = getAccountRow(db, accountId)
  if (row.auth_type === 'password') {
    return { row, auth: { kind: 'password', user: row.email, pass: decryptSecret(row.secret) } }
  }
  const cached = accessCache.get(accountId)
  if (cached && cached.expiresAt > Date.now()) {
    return { row, auth: { kind: 'oauth', user: row.email, accessToken: cached.token } }
  }
  const t = await refresh(oauthConfig(row.provider as 'gmail' | 'outlook'), decryptSecret(row.secret))
  if (t.refreshToken !== decryptSecret(row.secret)) updateAccountSecret(db, accountId, encryptSecret(t.refreshToken))
  accessCache.set(accountId, { token: t.accessToken, expiresAt: t.expiresAt })
  return { row, auth: { kind: 'oauth', user: row.email, accessToken: t.accessToken } }
}

export function forgetAccount(accountId: number): void {
  accessCache.delete(accountId)
}
