import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Account, Category, CategoryCounts, MessageSummary, Settings } from '../../shared/types'
import { Sidebar } from './components/Sidebar'
import { MessageList } from './components/MessageList'
import { Reader } from './components/Reader'
import { Compose, type ComposeDraft } from './components/Compose'
import { SettingsModal } from './components/SettingsModal'
import { AddAccountModal } from './components/AddAccountModal'
import { Welcome } from './components/Welcome'
import { errorText } from './format'

const api = window.api
const EMPTY_COUNTS: CategoryCounts = { all: 0, people: 0, newsletters: 0, receipts: 0, notifications: 0 }

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loaded, setLoaded] = useState(false)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [category, setCategory] = useState<Category | 'all'>('people')
  const [search, setSearch] = useState('')
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [counts, setCounts] = useState<CategoryCounts>(EMPTY_COUNTS)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [syncing, setSyncing] = useState<Set<number>>(new Set())
  const [compose, setCompose] = useState<ComposeDraft | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 4500)
  }, [])

  const refresh = useCallback(async () => {
    const [list, c] = await Promise.all([
      api.listMessages({ accountId, category: search ? 'all' : category, search, limit: 300 }),
      api.counts(accountId)
    ])
    setMessages(list)
    setCounts(c)
  }, [accountId, category, search])

  useEffect(() => {
    void (async () => {
      const [a, s] = await Promise.all([api.listAccounts(), api.getSettings()])
      setAccounts(a)
      setSettings(s)
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), search ? 150 : 0)
    return () => window.clearTimeout(t)
  }, [refresh, search])

  useEffect(() => api.onSync((e) => {
    setSyncing((prev) => {
      const next = new Set(prev)
      if (e.type === 'sync-start') next.add(e.accountId)
      else next.delete(e.accountId)
      return next
    })
    if (e.type !== 'sync-start') {
      void refresh()
      void api.listAccounts().then(setAccounts)
    }
    if (e.type === 'sync-error') notify(`Sync failed: ${e.error}`)
  }), [refresh, notify])

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) ?? null, [messages, selectedId])

  const select = useCallback((m: MessageSummary | null) => {
    setSelectedId(m?.id ?? null)
    if (m && !m.seen) {
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, seen: true } : x)))
      setCounts((c) => ({ ...c, all: Math.max(0, c.all - 1), [m.category]: Math.max(0, c[m.category] - 1) }))
      api.setSeen(m.id, true).catch((err) => notify(errorText(err)))
    }
  }, [notify])

  const removeFromList = useCallback((id: number) => {
    setMessages((list) => {
      const idx = list.findIndex((m) => m.id === id)
      const next = list.filter((m) => m.id !== id)
      if (id === selectedId) setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? null)
      return next
    })
  }, [selectedId])

  const archive = useCallback(async (id: number) => {
    removeFromList(id)
    try { await api.archive(id); notify('Archived') } catch (err) { notify(errorText(err)); void refresh() }
  }, [removeFromList, notify, refresh])

  const trash = useCallback(async (id: number) => {
    removeFromList(id)
    try { await api.trash(id); notify('Moved to trash') } catch (err) { notify(errorText(err)); void refresh() }
  }, [removeFromList, notify, refresh])

  const toggleFlag = useCallback(async (m: MessageSummary) => {
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, flagged: !m.flagged } : x)))
    try { await api.setFlagged(m.id, !m.flagged) } catch (err) { notify(errorText(err)) }
  }, [notify])

  const moveSender = useCallback(async (sender: string, cat: Category) => {
    const n = await api.moveSender(sender, cat)
    notify(`Moved ${n} message${n === 1 ? '' : 's'} from ${sender} to ${cat}. Future mail will go there too.`)
    void refresh()
  }, [notify, refresh])

  const syncNow = useCallback(() => {
    api.syncAll().catch((err) => notify(errorText(err)))
  }, [notify])

  // Keyboard shortcuts: j/k move, e archive, # trash, r reply, c compose, / search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]') || compose || showSettings || showAdd) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = messages.findIndex((m) => m.id === selectedId)
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); select(messages[Math.min(messages.length - 1, idx + 1)] ?? null) }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); select(messages[Math.max(0, idx - 1)] ?? null) }
      else if (e.key === 'e' && selectedId) void archive(selectedId)
      else if (e.key === '#' && selectedId) void trash(selectedId)
      else if (e.key === 'c') setCompose({ accountId: accountId ?? accounts[0]?.id ?? 0, to: '', subject: '', body: '' })
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [messages, selectedId, select, archive, trash, compose, showSettings, showAdd, accountId, accounts])

  if (!loaded) return <div className="boot" />

  return (
    <div className="app">
      <Sidebar
        accounts={accounts}
        accountId={accountId}
        onAccount={(id) => { setAccountId(id); setSelectedId(null) }}
        category={category}
        onCategory={(c) => { setCategory(c); setSearch(''); setSelectedId(null) }}
        counts={counts}
        syncing={syncing.size > 0}
        onSync={syncNow}
        onCompose={() => setCompose({ accountId: accountId ?? accounts[0]?.id ?? 0, to: '', subject: '', body: '' })}
        onSettings={() => setShowSettings(true)}
        onAddAccount={() => setShowAdd(true)}
      />

      {accounts.length === 0 ? (
        <Welcome onAdd={() => setShowAdd(true)} onSettings={() => setShowSettings(true)} />
      ) : (
        <>
          <MessageList
            messages={messages}
            accounts={accounts}
            selectedId={selectedId}
            onSelect={select}
            onArchive={archive}
            onFlag={toggleFlag}
            search={search}
            onSearch={setSearch}
            searchRef={searchRef}
            title={search ? 'Search' : category === 'all' ? 'Everything' : category}
            syncing={syncing.size > 0}
          />
          <Reader
            key={selected?.id ?? 'none'}
            summary={selected}
            account={accounts.find((a) => a.id === selected?.accountId) ?? null}
            loadRemoteImages={settings?.loadRemoteImages ?? false}
            onArchive={archive}
            onTrash={trash}
            onFlag={toggleFlag}
            onMoveSender={moveSender}
            onReply={(draft) => setCompose(draft)}
            onError={(e) => notify(errorText(e))}
          />
        </>
      )}

      {compose && (
        <Compose
          initial={compose}
          accounts={accounts}
          onClose={() => setCompose(null)}
          onSent={() => { setCompose(null); notify('Sent ✓') }}
        />
      )}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          accounts={accounts}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => { setSettings(s); notify('Settings saved') }}
          onAccounts={setAccounts}
        />
      )}
      {showAdd && (
        <AddAccountModal
          settings={settings}
          onClose={() => setShowAdd(false)}
          onAdded={(a) => { setAccounts(a); setShowAdd(false); notify('Account added. Syncing your inbox…') }}
          onOpenSettings={() => { setShowAdd(false); setShowSettings(true) }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
