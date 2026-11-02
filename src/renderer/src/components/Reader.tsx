import { useEffect, useState } from 'react'
import type { Account, Category, MessageFull, MessageSummary } from '../../../shared/types'
import { CATEGORIES } from '../../../shared/types'
import { avatarColor, formatFull, initials } from '../format'
import { AiSummary } from './AiPanel'
import type { ComposeDraft } from './Compose'
import { EmailFrame, hasRemoteContent } from './EmailFrame'
import { IconArchive, IconClip, IconReply, IconSparkle, IconStar, IconTrash } from './Icons'

interface Props {
  summary: MessageSummary | null
  account: Account | null
  loadRemoteImages: boolean
  onArchive: (id: number) => void
  onTrash: (id: number) => void
  onFlag: (m: MessageSummary) => void
  onMoveSender: (sender: string, c: Category) => void
  onReply: (d: ComposeDraft) => void
  onError: (e: unknown) => void
}

function quote(m: MessageFull): string {
  const body = (m.text ?? '').trim().split('\n').map((l) => `> ${l}`).join('\n')
  return `\n\nOn ${formatFull(m.date)}, ${m.fromName || m.fromEmail} wrote:\n${body}`
}

export function Reader({ summary, account, loadRemoteImages, onArchive, onTrash, onFlag, onMoveSender, onReply, onError }: Props) {
  const [msg, setMsg] = useState<MessageFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [remote, setRemote] = useState(loadRemoteImages)

  useEffect(() => {
    if (!summary) return
    let alive = true
    setLoading(true)
    window.api.getMessage(summary.id)
      .then((m) => alive && setMsg(m))
      .catch((e) => alive && onError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [summary?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 's' summarises, 'r' replies (while the reader has a message)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.metaKey || e.ctrlKey) return
      if (e.key === 's' && msg) setShowAi(true)
      if (e.key === 'r' && msg) reply(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!summary) {
    return (
      <main className="reader empty-reader">
        <div>
          <div className="big-mark">✉</div>
          <p>Select a message to read it.</p>
          <p className="shortcuts"><kbd>j</kbd>/<kbd>k</kbd> move · <kbd>e</kbd> archive · <kbd>r</kbd> reply · <kbd>s</kbd> summarize · <kbd>c</kbd> compose</p>
        </div>
      </main>
    )
  }

  function reply(all: boolean) {
    if (!msg || !account) return
    const me = account.email.toLowerCase()
    const cc = all
      ? [...msg.to, ...msg.cc].map((a) => a.address).filter((a) => a && a.toLowerCase() !== me && a.toLowerCase() !== msg.fromEmail)
      : []
    onReply({
      accountId: msg.accountId,
      to: msg.fromEmail,
      cc: cc.join(', '),
      subject: /^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`,
      body: quote(msg),
      inReplyToId: msg.id
    })
  }

  const domain = summary.fromEmail.split('@')[1] ?? ''
  const blocked = !remote && hasRemoteContent(msg?.html ?? null)

  return (
    <main className="reader">
      <div className="reader-toolbar">
        <button className="tool" onClick={() => reply(false)} disabled={!msg} title="Reply (r)"><IconReply /> Reply</button>
        <button className="tool" onClick={() => reply(true)} disabled={!msg}>Reply all</button>
        <button className="tool ai" onClick={() => setShowAi(true)} disabled={!msg} title="Summarize (s)"><IconSparkle /> Summarize</button>
        <span className="spacer" />
        <select
          className="tool select"
          value=""
          onChange={(e) => {
            const [scope, cat] = e.target.value.split(':')
            if (cat) onMoveSender(scope === 'domain' ? '@' + domain : summary.fromEmail, cat as Category)
          }}
          title="Always file this sender in…"
        >
          <option value="">Move sender…</option>
          <optgroup label={summary.fromEmail}>
            {CATEGORIES.filter((c) => c.id !== summary.category).map((c) => (
              <option key={c.id} value={`sender:${c.id}`}>→ {c.label}</option>
            ))}
          </optgroup>
          {domain && (
            <optgroup label={`Everyone @${domain}`}>
              {CATEGORIES.filter((c) => c.id !== summary.category).map((c) => (
                <option key={c.id} value={`domain:${c.id}`}>→ {c.label}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button className={`tool icon ${summary.flagged ? 'on' : ''}`} onClick={() => onFlag(summary)} title="Star"><IconStar filled={summary.flagged} /></button>
        <button className="tool icon" onClick={() => onArchive(summary.id)} title="Archive (e)"><IconArchive /></button>
        <button className="tool icon" onClick={() => onTrash(summary.id)} title="Delete (#)"><IconTrash /></button>
      </div>

      <div className="reader-scroll">
        <h2 className="reader-subject">{summary.subject}</h2>
        <div className="reader-meta">
          <div className="avatar lg" style={{ background: avatarColor(summary.fromEmail) }}>{initials(summary.fromName || summary.fromEmail)}</div>
          <div className="meta-text">
            <div><strong>{summary.fromName}</strong> <span className="muted">&lt;{summary.fromEmail}&gt;</span></div>
            <div className="muted small">
              to {msg?.to.map((a) => a.name || a.address).join(', ') || '…'}
              {msg && msg.cc.length > 0 && <> · cc {msg.cc.map((a) => a.name || a.address).join(', ')}</>}
            </div>
          </div>
          <div className="muted small right">
            {formatFull(summary.date)}
            {account && <div className="acct-tag"><span className="dot" style={{ background: account.color }} />{account.email}</div>}
          </div>
        </div>

        {showAi && msg && <AiSummary messageId={summary.id} onClose={() => setShowAi(false)} />}

        {blocked && (
          <div className="remote-bar">
            Remote images are blocked to stop senders tracking when you open this email.
            <button onClick={() => setRemote(true)}>Load images</button>
          </div>
        )}

        {loading && !msg && <div className="loading-body"><div className="skeleton" /><div className="skeleton" /><div className="skeleton short" /></div>}
        {msg && <EmailFrame html={msg.html} text={msg.text} allowRemote={remote} />}

        {msg && msg.attachments.length > 0 && (
          <div className="attachments">
            {msg.attachments.map((a, i) => (
              <span key={i} className="attachment"><IconClip /> {a.filename} <span className="muted">{Math.ceil(a.size / 1024)} KB</span></span>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
