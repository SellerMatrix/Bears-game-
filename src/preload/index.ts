import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { MailApi } from '../shared/api'

// The only bridge between the web UI and Node. The UI never gets direct
// access to the filesystem, tokens or network sockets.

const invoke = (channel: string) => (...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

function subscribe<T>(channel: string, cb: (e: T) => void): () => void {
  const listener = (_: IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: MailApi = {
  listAccounts: invoke('accounts:list') as MailApi['listAccounts'],
  addOAuthAccount: invoke('accounts:addOAuth') as MailApi['addOAuthAccount'],
  addPasswordAccount: invoke('accounts:addPassword') as MailApi['addPasswordAccount'],
  passwordPreset: invoke('accounts:preset') as MailApi['passwordPreset'],
  removeAccount: invoke('accounts:remove') as MailApi['removeAccount'],
  syncAll: invoke('mail:syncAll') as MailApi['syncAll'],
  listMessages: invoke('mail:list') as MailApi['listMessages'],
  counts: invoke('mail:counts') as MailApi['counts'],
  getMessage: invoke('mail:get') as MailApi['getMessage'],
  setSeen: invoke('mail:setSeen') as MailApi['setSeen'],
  setFlagged: invoke('mail:setFlagged') as MailApi['setFlagged'],
  archive: invoke('mail:archive') as MailApi['archive'],
  trash: invoke('mail:trash') as MailApi['trash'],
  moveSender: invoke('mail:moveSender') as MailApi['moveSender'],
  send: invoke('mail:send') as MailApi['send'],
  summarize: invoke('ai:summarize') as MailApi['summarize'],
  draftReply: invoke('ai:draftReply') as MailApi['draftReply'],
  cancelAi: invoke('ai:cancel') as MailApi['cancelAi'],
  getSettings: invoke('settings:get') as MailApi['getSettings'],
  saveSettings: invoke('settings:save') as MailApi['saveSettings'],
  openExternal: invoke('shell:open') as MailApi['openExternal'],
  onSync: (cb) => subscribe('event:sync', cb),
  onAi: (cb) => subscribe('event:ai', cb)
}

contextBridge.exposeInMainWorld('api', api)
