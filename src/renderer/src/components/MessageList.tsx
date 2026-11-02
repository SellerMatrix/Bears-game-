import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import type { Account, MessageSummary } from '../../../shared/types'
import { avatarColor, formatDate, initials } from '../format'
import { IconArchive, IconClip, IconSearch, IconStar } from './Icons'

interface Props {
  messages: MessageSummary[]
  accounts: Account[]
  selectedId: number | null
  onSelect: (m: MessageSummary) => void
  onArchive: (id: number) => void
  onFlag: (m: MessageSummary) => void
  search: string
  onSearch: (s: string) => void
  searchRef: RefObject<HTMLInputElement | null>
  title: string
  syncing: boolean
}

export function MessageList(p: Props) {
  const color = new Map(p.accounts.map((a) => [a.id, a.color]))
  const multi = p.accounts.length > 1
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.querySelector('.row.selected')?.scrollIntoView({ block: 'nearest' })
  }, [p.selectedId])

  return (
    <section className="list-pane">
      <header className="list-head">
        <h1>{p.title}</h1>
        <label className="search">
          <IconSearch />
          <input
            ref={p.searchRef}
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (p.onSearch(''), e.currentTarget.blur())}
            placeholder="Search all mail  ( / )"
          />
        </label>
      </header>

      <div className="rows" ref={listRef}>
        {p.messages.length === 0 && (
          <div className="empty">{p.syncing ? 'Syncing…' : p.search ? 'No results.' : 'Nothing here. Enjoy the calm.'}</div>
        )}
        {p.messages.map((m) => (
          <div
            key={m.id}
            className={`row ${m.id === p.selectedId ? 'selected' : ''} ${m.seen ? '' : 'unread'}`}
            onClick={() => p.onSelect(m)}
          >
            <div className="avatar" style={{ background: avatarColor(m.fromEmail) }}>{initials(m.fromName || m.fromEmail)}</div>
            <div className="row-main">
              <div className="row-top">
                <span className="from">{m.fromName || m.fromEmail}</span>
                {m.hasAttachments && <span className="clip"><IconClip /></span>}
                <span className="date">{formatDate(m.date)}</span>
              </div>
              <div className="subject">
                {multi && <span className="acct-dot" style={{ background: color.get(m.accountId) }} />}
                {m.subject}
              </div>
              <div className="snippet">{m.snippet.trim() || ' '}</div>
            </div>
            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
              <button className={`mini ${m.flagged ? 'on' : ''}`} title="Star" onClick={() => p.onFlag(m)}><IconStar filled={m.flagged} /></button>
              <button className="mini" title="Archive (e)" onClick={() => p.onArchive(m.id)}><IconArchive /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
