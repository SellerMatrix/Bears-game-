import type {
  Account, AiEvent, Category, CategoryCounts, ListQuery, MessageFull, MessageSummary,
  PasswordAccountInput, SendInput, Settings, SyncEvent
} from './types'

/** Everything the UI can ask the main process to do (exposed as window.api). */
export interface MailApi {
  listAccounts(): Promise<Account[]>
  addOAuthAccount(provider: 'gmail' | 'outlook'): Promise<Account[]>
  addPasswordAccount(input: PasswordAccountInput): Promise<Account[]>
  passwordPreset(email: string): Promise<Omit<PasswordAccountInput, 'email' | 'name' | 'password'> | null>
  removeAccount(id: number): Promise<Account[]>

  syncAll(): Promise<void>
  listMessages(q: ListQuery): Promise<MessageSummary[]>
  counts(accountId?: number | null): Promise<CategoryCounts>
  getMessage(id: number): Promise<MessageFull>
  setSeen(id: number, seen: boolean): Promise<void>
  setFlagged(id: number, flagged: boolean): Promise<void>
  archive(id: number): Promise<void>
  trash(id: number): Promise<void>
  moveSender(sender: string, category: Category): Promise<number>
  send(input: SendInput): Promise<void>

  summarize(id: number, requestId: string): Promise<void>
  draftReply(id: number, instruction: string, requestId: string): Promise<void>
  cancelAi(requestId: string): Promise<void>

  getSettings(): Promise<Settings>
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  openExternal(url: string): Promise<void>

  onSync(cb: (e: SyncEvent) => void): () => void
  onAi(cb: (e: AiEvent) => void): () => void
}
