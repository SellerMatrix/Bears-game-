import { shell } from 'electron'
import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

// OAuth 2.0 "installed app" flow with PKCE and a loopback redirect:
// 1. start a tiny web server on 127.0.0.1:<random port>
// 2. open the provider's consent page in the user's browser
// 3. the provider redirects back to our server with ?code=...
// 4. exchange the code for an access token + refresh token

export interface OAuthProviderConfig {
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientId: string
  clientSecret?: string
  redirectHost: '127.0.0.1' | 'localhost'
  extraAuthParams?: Record<string, string>
}

export interface TokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: number
  idTokenClaims: Record<string, unknown>
}

export const GOOGLE = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: ['https://mail.google.com/', 'openid', 'email', 'profile'],
  redirectHost: '127.0.0.1' as const,
  extraAuthParams: { access_type: 'offline', prompt: 'consent' }
}

export const MICROSOFT = {
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: [
    'offline_access', 'openid', 'email', 'profile',
    'https://outlook.office.com/IMAP.AccessAsUser.All',
    'https://outlook.office.com/SMTP.Send'
  ],
  redirectHost: 'localhost' as const,
  extraAuthParams: { prompt: 'select_account' }
}

const b64url = (buf: Buffer) => buf.toString('base64url')

function decodeJwtClaims(jwt: string | undefined): Record<string, unknown> {
  if (!jwt) return {}
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const DONE_PAGE = (msg: string) => `<!doctype html><meta charset="utf-8"><title>My Mail</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:90vh;color:#333">
<div style="text-align:center"><h2>${msg}</h2><p>You can close this tab and return to My Mail.</p></div></body>`

export async function authorize(cfg: OAuthProviderConfig, timeoutMs = 5 * 60_000): Promise<TokenSet> {
  const verifier = b64url(crypto.randomBytes(32))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  const state = b64url(crypto.randomBytes(16))

  const server = http.createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  const redirectUri = `http://${cfg.redirectHost}:${port}`

  const codePromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sign-in timed out.')), timeoutMs)
    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', redirectUri)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      if (!code && !error) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (error || url.searchParams.get('state') !== state) {
        res.end(DONE_PAGE('Sign-in failed'))
        clearTimeout(timer)
        reject(new Error(url.searchParams.get('error_description') || error || 'State mismatch'))
        return
      }
      res.end(DONE_PAGE('Signed in ✓'))
      clearTimeout(timer)
      resolve(code!)
    })
  })

  try {
    const auth = new URL(cfg.authUrl)
    auth.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      ...cfg.extraAuthParams
    }).toString()
    await shell.openExternal(auth.toString())

    const code = await codePromise
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      code_verifier: verifier,
      scope: cfg.scopes.join(' ')
    })
    if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret)
    return await tokenRequest(cfg.tokenUrl, body)
  } finally {
    server.close()
  }
}

export async function refresh(cfg: OAuthProviderConfig, refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    scope: cfg.scopes.join(' ')
  })
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret)
  const t = await tokenRequest(cfg.tokenUrl, body)
  // Google doesn't return a new refresh token on refresh; Microsoft may rotate it.
  return { ...t, refreshToken: t.refreshToken || refreshToken }
}

async function tokenRequest(url: string, body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, string | number>
  if (!res.ok || !json.access_token) {
    const reason = json.error_description || json.error || `HTTP ${res.status}`
    if (json.error === 'invalid_grant') {
      throw new Error(`Login expired or was revoked. Remove and re-add this account. (${reason})`)
    }
    throw new Error(`Token request failed: ${reason}`)
  }
  return {
    accessToken: String(json.access_token),
    refreshToken: String(json.refresh_token ?? ''),
    expiresAt: Date.now() + (Number(json.expires_in ?? 3600) - 60) * 1000,
    idTokenClaims: decodeJwtClaims(json.id_token as string | undefined)
  }
}
