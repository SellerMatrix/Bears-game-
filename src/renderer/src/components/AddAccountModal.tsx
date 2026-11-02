import { useState } from 'react'
import type { Account, PasswordAccountInput, Settings } from '../../../shared/types'
import { errorText } from '../format'
import { Modal } from './Modal'

interface Props {
  settings: Settings | null
  onClose: () => void
  onAdded: (accounts: Account[]) => void
  onOpenSettings: () => void
}

const BLANK: PasswordAccountInput = { email: '', name: '', password: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465 }

export function AddAccountModal({ settings, onClose, onAdded, onOpenSettings }: Props) {
  const [mode, setMode] = useState<'pick' | 'password'>('pick')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PasswordAccountInput>(BLANK)

  async function oauth(provider: 'gmail' | 'outlook') {
    setError('')
    setBusy(provider)
    try {
      onAdded(await window.api.addOAuthAccount(provider))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  async function lookupPreset(email: string) {
    const preset = await window.api.passwordPreset(email)
    if (preset) setForm((f) => ({ ...f, ...preset }))
  }

  async function addPassword() {
    setError('')
    setBusy('password')
    try {
      onAdded(await window.api.addPasswordAccount(form))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  const googleReady = !!settings?.googleClientId
  const msReady = !!settings?.microsoftClientId

  return (
    <Modal title="Add an email account" onClose={onClose}>
      {mode === 'pick' ? (
        <div className="provider-grid">
          <button className="provider" onClick={() => oauth('gmail')} disabled={!!busy || !googleReady}>
            <span className="provider-logo g">G</span>
            <span><strong>Gmail</strong><br /><span className="muted small">{busy === 'gmail' ? 'Finish signing in in your browser…' : 'Sign in with Google'}</span></span>
          </button>
          <button className="provider" onClick={() => oauth('outlook')} disabled={!!busy || !msReady}>
            <span className="provider-logo o">O</span>
            <span><strong>Outlook / Hotmail / Live</strong><br /><span className="muted small">{busy === 'outlook' ? 'Finish signing in in your browser…' : 'Sign in with Microsoft'}</span></span>
          </button>
          <button className="provider" onClick={() => setMode('password')} disabled={!!busy}>
            <span className="provider-logo i">@</span>
            <span><strong>Other (IMAP)</strong><br /><span className="muted small">Yahoo, iCloud, AOL, Fastmail, or Gmail with an app password</span></span>
          </button>
          {(!googleReady || !msReady) && (
            <p className="hint">
              To sign in with {!googleReady && 'Google'}{!googleReady && !msReady && ' or '}{!msReady && 'Microsoft'}, first paste your
              free OAuth app IDs into <a href="#" onClick={(e) => { e.preventDefault(); onOpenSettings() }}>Settings</a>.
              The README has 5-minute setup steps.
            </p>
          )}
        </div>
      ) : (
        <form className="form" onSubmit={(e) => { e.preventDefault(); void addPassword() }}>
          <label>Email<input type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={(e) => void lookupPreset(e.target.value)} /></label>
          <label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shown to people you email" /></label>
          <label>App password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <p className="hint">Use an <em>app password</em> from your provider's security settings, not your normal password.</p>
          <div className="form-row">
            <label>IMAP server<input required value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} placeholder="imap.example.com" /></label>
            <label className="port">Port<input type="number" required value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })} /></label>
          </div>
          <div className="form-row">
            <label>SMTP server<input required value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.example.com" /></label>
            <label className="port">Port<input type="number" required value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} /></label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setMode('pick')}>Back</button>
            <button className="primary" type="submit" disabled={busy === 'password'}>{busy ? 'Adding…' : 'Add account'}</button>
          </div>
        </form>
      )}
      {error && <div className="error block">{error}</div>}
    </Modal>
  )
}
