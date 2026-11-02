import type { MailApi } from '../../shared/api'

declare global {
  interface Window {
    api: MailApi
  }
}
export {}
