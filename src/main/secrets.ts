import { safeStorage } from 'electron'

// Secrets (refresh tokens, passwords, API keys) are encrypted with the
// operating system's keychain via Electron safeStorage before they touch disk:
// macOS Keychain, Windows DPAPI, or the Linux Secret Service (GNOME Keyring / KWallet).
//
// Only on Linux machines with no keyring running do we fall back to storing the
// value unencrypted (marked "plain:") inside the app's private data folder.

const PLAIN = 'plain:'
let warned = false

export function encryptSecret(plain: string): string {
  if (!plain) return ''
  if (safeStorage.isEncryptionAvailable()) return safeStorage.encryptString(plain).toString('base64')
  if (process.platform !== 'linux') throw new Error('OS keychain encryption is not available on this system.')
  if (!warned) {
    console.warn('[my-mail] No system keyring found; secrets are stored unencrypted in the app data folder.')
    warned = true
  }
  return PLAIN + Buffer.from(plain, 'utf8').toString('base64')
}

export function decryptSecret(blob: string | null | undefined): string {
  if (!blob) return ''
  if (blob.startsWith(PLAIN)) return Buffer.from(blob.slice(PLAIN.length), 'base64').toString('utf8')
  return safeStorage.decryptString(Buffer.from(blob, 'base64'))
}
