import type { ReactNode } from 'react'
import type { Account, Category, CategoryCounts } from '../../../shared/types'
import { IconAll, IconBell, IconGear, IconNews, IconPen, IconPeople, IconPlus, IconReceipt, IconSync } from './Icons'

const NAV: { id: Category | 'all'; label: string; icon: ReactNode }[] = [
  { id: 'people', label: 'People', icon: <IconPeople /> },
  { id: 'newsletters', label: 'Newsletters', icon: <IconNews /> },
  { id: 'receipts', label: 'Receipts', icon: <IconReceipt /> },
  { id: 'notifications', label: 'Notifications', icon: <IconBell /> },
  { id: 'all', label: 'Everything', icon: <IconAll /> }
]

interface Props {
  accounts: Account[]
  accountId: number | null
  onAccount: (id: number | null) => void
  category: Category | 'all'
  onCategory: (c: Category | 'all') => void
  counts: CategoryCounts
  syncing: boolean
  onSync: () => void
  onCompose: () => void
  onSettings: () => void
  onAddAccount: () => void
}

export function Sidebar(p: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">✉</span> My Mail
      </div>

      <button className="compose-btn" onClick={p.onCompose} disabled={!p.accounts.length} title="Compose (c)">
        <IconPen /> Compose
      </button>

      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${p.category === n.id ? 'active' : ''}`}
            onClick={() => p.onCategory(n.id)}
          >
            {n.icon}
            <span>{n.label}</span>
            {p.counts[n.id] > 0 && <span className="count">{p.counts[n.id]}</span>}
          </button>
        ))}
      </nav>

      <div className="section-label">Accounts</div>
      <div className="accounts">
        <button className={`acct ${p.accountId === null ? 'active' : ''}`} onClick={() => p.onAccount(null)}>
          <span className="dot unified" /> All inboxes
        </button>
        {p.accounts.map((a) => (
          <button
            key={a.id}
            className={`acct ${p.accountId === a.id ? 'active' : ''}`}
            onClick={() => p.onAccount(a.id)}
            title={a.lastError ? `Last sync failed: ${a.lastError}` : a.email}
          >
            <span className="dot" style={{ background: a.color }} />
            <span className="acct-email">{a.email}</span>
            {a.lastError && <span className="warn" aria-label="sync error">!</span>}
          </button>
        ))}
        <button className="acct add" onClick={p.onAddAccount}>
          <IconPlus /> Add account
        </button>
      </div>

      <div className="sidebar-foot">
        <button className={`icon-btn ${p.syncing ? 'spin' : ''}`} onClick={p.onSync} title="Check for new mail" disabled={!p.accounts.length}>
          <IconSync />
        </button>
        <button className="icon-btn" onClick={p.onSettings} title="Settings">
          <IconGear />
        </button>
      </div>
    </aside>
  )
}
