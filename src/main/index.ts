import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import type { AiEvent, Category, ListQuery, PasswordAccountInput, SendInput, Settings, SyncEvent } from '@shared/types'
import { CATEGORIES } from '@shared/types'
import { PRESETS, addOAuthAccount, addPasswordAccount, forgetAccount } from './accounts'
import { cancelAi, draftReply, summarize } from './ai'
import {
  categoryCounts, deleteAccount, getMessageRow, listAccountRows, listMessages, openDb, setFlagged, setSeen,
  setSenderRule, toAccount, type DB
} from './db'
import { sendMail } from './send'
import { getPublicSettings, getSettings, saveSettings } from './settings'
import { getFullMessage, moveMessage, setFlaggedRemote, setSeenRemote, syncAccount } from './sync'

let win: BrowserWindow | null = null
let db: DB
let syncTimer: NodeJS.Timeout | null = null

const emitSync = (e: SyncEvent) => win?.webContents.send('event:sync', e)
const emitAi = (e: AiEvent) => win?.webContents.send('event:ai', e)
const accounts = () => listAccountRows(db).map(toAccount)

async function syncAll(): Promise<void> {
  await Promise.all(listAccountRows(db).map((a) => syncAccount(db, a.id, emitSync)))
}

function scheduleSync(): void {
  if (syncTimer) clearInterval(syncTimer)
  const minutes = Math.max(1, getSettings().syncIntervalMinutes || 2)
  syncTimer = setInterval(() => void syncAll(), minutes * 60_000)
}

function isSafeExternal(url: string): boolean {
  try {
    return ['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 560,
    title: 'My Mail',
    backgroundColor: '#f7f6f3',
    show: false,
    // Native-looking Mac window: traffic lights float over the sidebar.
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 18 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win?.show())

  // Links clicked inside emails open in the real browser, never in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternal(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win?.webContents.getURL()) {
      e.preventDefault()
      if (isSafeExternal(url)) void shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

function registerIpc(): void {
  ipcMain.handle('accounts:list', () => accounts())
  ipcMain.handle('accounts:addOAuth', async (_e, provider: 'gmail' | 'outlook') => {
    const id = await addOAuthAccount(db, provider)
    void syncAccount(db, id, emitSync)
    return accounts()
  })
  ipcMain.handle('accounts:addPassword', async (_e, input: PasswordAccountInput) => {
    const id = addPasswordAccount(db, input)
    void syncAccount(db, id, emitSync)
    return accounts()
  })
  ipcMain.handle('accounts:preset', (_e, email: string) => PRESETS[email.split('@')[1]?.toLowerCase() ?? ''] ?? null)
  ipcMain.handle('accounts:remove', (_e, id: number) => {
    deleteAccount(db, id)
    forgetAccount(id)
    return accounts()
  })

  ipcMain.handle('mail:syncAll', () => syncAll())
  ipcMain.handle('mail:list', (_e, q: ListQuery) => listMessages(db, q))
  ipcMain.handle('mail:counts', (_e, accountId?: number | null) => categoryCounts(db, accountId))
  ipcMain.handle('mail:get', (_e, id: number) => getFullMessage(db, id))
  ipcMain.handle('mail:setSeen', async (_e, id: number, seen: boolean) => {
    setSeen(db, id, seen) // optimistic; the server catches up
    await setSeenRemote(db, id, seen)
  })
  ipcMain.handle('mail:setFlagged', async (_e, id: number, flagged: boolean) => {
    setFlagged(db, id, flagged)
    await setFlaggedRemote(db, id, flagged)
  })
  ipcMain.handle('mail:archive', (_e, id: number) => moveMessage(db, id, 'archive'))
  ipcMain.handle('mail:trash', (_e, id: number) => moveMessage(db, id, 'trash'))
  ipcMain.handle('mail:moveSender', (_e, sender: string, category: Category) => {
    if (!CATEGORIES.some((c) => c.id === category)) throw new Error('Unknown category')
    return setSenderRule(db, sender, category)
  })
  ipcMain.handle('mail:send', (_e, input: SendInput) => sendMail(db, input))

  ipcMain.handle('ai:summarize', (_e, id: number, requestId: string) => summarize(db, id, requestId, emitAi))
  ipcMain.handle('ai:draftReply', (_e, id: number, instruction: string, requestId: string) => {
    getMessageRow(db, id)
    return draftReply(db, id, instruction, requestId, emitAi)
  })
  ipcMain.handle('ai:cancel', (_e, requestId: string) => cancelAi(requestId))

  ipcMain.handle('settings:get', () => getPublicSettings())
  ipcMain.handle('settings:save', (_e, patch: Partial<Settings>) => {
    // The UI shows secrets masked; a masked value means "unchanged".
    const clean = { ...patch }
    if (clean.googleClientSecret === '••••••••') delete clean.googleClientSecret
    if (clean.anthropicApiKey === '••••••••') delete clean.anthropicApiKey
    saveSettings(clean)
    scheduleSync()
    return getPublicSettings()
  })
  ipcMain.handle('shell:open', (_e, url: string) => {
    if (isSafeExternal(url)) return shell.openExternal(url)
  })
}

app.whenReady().then(() => {
  db = openDb(path.join(app.getPath('userData'), 'mail.sqlite'))
  registerIpc()
  createWindow()
  void syncAll()
  scheduleSync()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
