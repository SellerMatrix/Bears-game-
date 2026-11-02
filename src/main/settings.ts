import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { decryptSecret, encryptSecret } from './secrets'

const SECRET_KEYS = ['googleClientSecret', 'anthropicApiKey'] as const

function file(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

let cache: Settings | null = null

export function getSettings(): Settings {
  if (cache) return cache
  let stored: Partial<Settings> = {}
  try {
    stored = JSON.parse(fs.readFileSync(file(), 'utf8'))
  } catch {
    // first run, or unreadable file: fall back to defaults
  }
  const merged: Settings = { ...DEFAULT_SETTINGS, ...stored }
  for (const key of SECRET_KEYS) {
    try {
      merged[key] = decryptSecret(stored[key] as string)
    } catch {
      merged[key] = ''
    }
  }
  cache = merged
  return merged
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next: Settings = { ...getSettings(), ...patch }
  const onDisk: Record<string, unknown> = { ...next }
  for (const key of SECRET_KEYS) onDisk[key] = encryptSecret(next[key])
  fs.mkdirSync(path.dirname(file()), { recursive: true })
  fs.writeFileSync(file(), JSON.stringify(onDisk, null, 2), { mode: 0o600 })
  cache = next
  return next
}

/** What the UI gets: secrets are replaced by a "set / not set" marker. */
export function getPublicSettings(): Settings {
  const s = getSettings()
  return {
    ...s,
    googleClientSecret: s.googleClientSecret ? '••••••••' : '',
    anthropicApiKey: s.anthropicApiKey ? '••••••••' : ''
  }
}
