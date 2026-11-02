import nodemailer from 'nodemailer'
import type { SendInput } from '@shared/types'
import { getAuth } from './accounts'
import { getMessageRow, type DB } from './db'

export async function sendMail(db: DB, input: SendInput): Promise<void> {
  const { row, auth } = await getAuth(db, input.accountId)
  const transport = nodemailer.createTransport({
    host: row.smtp_host,
    port: row.smtp_port,
    secure: row.smtp_port === 465,
    requireTLS: row.smtp_port === 587,
    auth: auth.kind === 'oauth'
      ? { type: 'OAuth2', user: auth.user, accessToken: auth.accessToken }
      : { user: auth.user, pass: auth.pass }
  })

  const headers: { inReplyTo?: string; references?: string } = {}
  if (input.inReplyToId) {
    const orig = getMessageRow(db, input.inReplyToId)
    if (orig.message_id) {
      headers.inReplyTo = orig.message_id
      headers.references = [orig.refs, orig.message_id].filter(Boolean).join(' ')
    }
  }

  await transport.sendMail({
    from: row.name ? { name: row.name, address: row.email } : row.email,
    to: input.to,
    cc: input.cc || undefined,
    subject: input.subject,
    text: input.body,
    ...headers
  })
  // Gmail and Outlook save SMTP-sent mail to "Sent" automatically.
}
