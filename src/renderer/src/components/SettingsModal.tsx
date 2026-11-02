import { useState } from 'react'
import type { Account, Settings } from '../../../shared/types'
import { errorText } from '../format'
import { Modal } from './Modal'

interface Props {
  settings: Settings
  accounts: Account[]
  onClose: () => void
  onSaved: (s: Settings) => void
  onAccounts: (a: Account[]) => void
}

export function SettingsModal({ settings, accounts, onClose, onSaved, onAccounts }: Props) {
  const [s, setS] = useState<Settings>(settings)
  const [error, setError] = useState('')
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }))

  async function save() {
    try {
      onSaved(await window.api.saveSettings(s))
      onClose()
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function remove(a: Account) {
    if (!confirm(`Remove ${a.email}? Its downloaded mail is deleted from this computer (nothing is deleted on the server).`)) return
    onAccounts(await window.api.removeAccount(a.id))
  }

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="form">
        <h4>Accounts</h4>
        {accounts.length === 0 && <p className="muted small">No accounts yet.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="acct-row">
            <span className="dot" style={{ background: a.color }} />
            <span className="grow">{a.email} <span className="muted small">({a.provider})</span>
              {a.lastError && <div className="error small">Last sync: {a.lastError}</div>}
            </span>
            <button onClick={() => remove(a)}>Remove</button>
          </div>
        ))}

        <h4>Google sign-in (for Gmail)</h4>
        <label>OAuth Client ID<input value={s.googleClientId} onChange={(e) => set('googleClientId', e.target.value.trim())} placeholder="1234-abc.apps.googleusercontent.com" /></label>
        <label>OAuth Client secret<input type="password" value={s.googleClientSecret} onChange={(e) => set('googleClientSecret', e.target.value.trim())} placeholder="GOCSPX-…" /></label>

        <h4>Microsoft sign-in (for Outlook / Hotmail)</h4>
        <label>Application (client) ID<input value={s.microsoftClientId} onChange={(e) => set('microsoftClientId', e.target.value.trim())} placeholder="00000000-0000-0000-0000-000000000000" /></label>

        <h4>AI (Claude)</h4>
        <label>Anthropic API key<input type="password" value={s.anthropicApiKey} onChange={(e) => set('anthropicApiKey', e.target.value.trim())} placeholder="sk-ant-…" /></label>
        <label>Model
          <select value={s.aiModel} onChange={(e) => set('aiModel', e.target.value)}>
            <option value="claude-opus-5-5">Claude Opus 5.5 (best quality)</option>
            <option value="claude-sonnet-5-5">Claude Sonnet 5.5 (cheaper)</option>
            <option value="claude-haiku-5-5">Claude Haiku 5.5 (cheapest, fastest)</option>
          </select>
        </label>
        <p className="hint">Only the thread you ask about is sent to Anthropic, and only when you click Summarize or Draft reply.</p>

        <h4>Privacy & sync</h4>
        <label className="check"><input type="checkbox" checked={s.loadRemoteImages} onChange={(e) => set('loadRemoteImages', e.target.checked)} /> Always load remote images (lets senders see when you open mail)</label>
        <div className="form-row">
          <label>Check for mail every (minutes)<input type="number" min={1} value={s.syncIntervalMinutes} onChange={(e) => set('syncIntervalMinutes', Number(e.target.value))} /></label>
          <label>Messages to download per account<input type="number" min={50} step={50} value={s.messagesPerAccount} onChange={(e) => set('messagesPerAccount', Number(e.target.value))} /></label>
        </div>

        {error && <div className="error block">{error}</div>}
        <div className="form-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>Save</button>
        </div>
      </div>
    </Modal>
  )
}
