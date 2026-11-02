import { useEffect, useRef, useState } from 'react'
import type { Account } from '../../../shared/types'
import { errorText, newRequestId } from '../format'
import { IconSparkle, IconX } from './Icons'

export interface ComposeDraft {
  accountId: number
  to: string
  cc?: string
  subject: string
  body: string
  inReplyToId?: number | null
}

interface Props {
  initial: ComposeDraft
  accounts: Account[]
  onClose: () => void
  onSent: () => void
}

export function Compose({ initial, accounts, onClose, onSent }: Props) {
  const [d, setD] = useState<ComposeDraft>({ ...initial, accountId: initial.accountId || accounts[0]?.id || 0 })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [instruction, setInstruction] = useState('')
  const [drafting, setDrafting] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const draftReq = useRef<string | null>(null)
  const quoted = useRef(initial.body) // the quoted original, kept below the AI draft

  useEffect(() => {
    const el = bodyRef.current
    if (el) { el.focus(); el.setSelectionRange(0, 0) }
  }, [])

  useEffect(() => window.api.onAi((e) => {
    if (e.requestId !== draftReq.current) return
    if (e.type === 'delta') {
      setD((prev) => {
        const draftPart = prev.body.slice(0, Math.max(0, prev.body.length - quoted.current.length))
        return { ...prev, body: draftPart + e.text + quoted.current }
      })
    } else {
      setDrafting(false)
      draftReq.current = null
      if (e.type === 'error') setError(e.error)
    }
  }), [])

  useEffect(() => () => { if (draftReq.current) void window.api.cancelAi(draftReq.current) }, [])

  const set = <K extends keyof ComposeDraft>(k: K, v: ComposeDraft[K]) => setD((p) => ({ ...p, [k]: v }))

  async function aiDraft() {
    if (!d.inReplyToId) return
    setError('')
    setDrafting(true)
    setD((p) => ({ ...p, body: quoted.current }))
    const id = newRequestId()
    draftReq.current = id
    window.api.draftReply(d.inReplyToId, instruction, id).catch((err) => { setDrafting(false); setError(errorText(err)) })
  }

  async function send() {
    if (!d.to.trim()) { setError('Add at least one recipient.'); return }
    setSending(true)
    setError('')
    try {
      await window.api.send({ accountId: d.accountId, to: d.to, cc: d.cc, subject: d.subject, body: d.body, inReplyToId: d.inReplyToId })
      onSent()
    } catch (err) {
      setError(errorText(err))
      setSending(false)
    }
  }

  return (
    <div className="compose" onKeyDown={(e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send()
      if (e.key === 'Escape') onClose()
    }}>
      <div className="compose-head">
        <span>{d.inReplyToId ? 'Reply' : 'New message'}</span>
        <button className="mini" onClick={onClose} title="Discard (Esc)"><IconX /></button>
      </div>
      <div className="compose-fields">
        <label>From
          <select value={d.accountId} onChange={(e) => set('accountId', Number(e.target.value))}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name ? `${a.name} <${a.email}>` : a.email}</option>)}
          </select>
        </label>
        <label>To<input value={d.to} onChange={(e) => set('to', e.target.value)} placeholder="name@example.com, …" /></label>
        <label>Cc<input value={d.cc ?? ''} onChange={(e) => set('cc', e.target.value)} /></label>
        <label>Subject<input value={d.subject} onChange={(e) => set('subject', e.target.value)} /></label>
      </div>

      {d.inReplyToId && (
        <div className="ai-draft">
          <IconSparkle />
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.metaKey && !e.ctrlKey && (e.preventDefault(), void aiDraft())}
            placeholder="Tell Claude what to say, e.g. “yes to Thursday, ask for the address”"
          />
          <button onClick={aiDraft} disabled={drafting}>{drafting ? 'Writing…' : 'Draft reply'}</button>
        </div>
      )}

      <textarea ref={bodyRef} className="compose-body" value={d.body} onChange={(e) => {
        set('body', e.target.value)
        if (!e.target.value.endsWith(quoted.current)) quoted.current = ''
      }} />

      <div className="compose-foot">
        {error && <span className="error">{error}</span>}
        <span className="spacer" />
        <span className="muted small">⌘/Ctrl + Enter to send</span>
        <button className="primary" onClick={send} disabled={sending || drafting}>{sending ? 'Sending…' : 'Send'}</button>
      </div>
    </div>
  )
}
