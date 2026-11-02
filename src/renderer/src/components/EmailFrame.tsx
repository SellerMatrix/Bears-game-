import DOMPurify from 'dompurify'
import { useEffect, useMemo, useRef, useState } from 'react'

// Renders email HTML safely:
// - DOMPurify strips scripts, event handlers, forms and other active content
// - a sandboxed iframe (no allow-scripts) isolates email CSS from the app
// - a CSP inside the frame blocks remote images (tracking pixels) unless allowed

interface Props {
  html: string | null
  text: string | null
  allowRemote: boolean
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function textToHtml(text: string): string {
  const linked = escape(text).replace(/\bhttps?:\/\/[^\s<>"')]+/g, (u) => `<a href="${u}">${u}</a>`)
  return `<div class="plain">${linked}</div>`
}

export function hasRemoteContent(html: string | null): boolean {
  return !!html && /(<img[^>]+src\s*=\s*["']?\s*https?:|url\(\s*["']?https?:)/i.test(html)
}

export function EmailFrame({ html, text, allowRemote }: Props) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(200)

  const doc = useMemo(() => {
    const body = html
      ? DOMPurify.sanitize(html, {
          WHOLE_DOCUMENT: false,
          FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'meta', 'link', 'base'],
          FORBID_ATTR: ['srcset']
        })
      : textToHtml(text ?? '')
    const imgSrc = allowRemote ? 'data: https: http:' : 'data:'
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:;">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fff;color:#1f1f1f;}
  body{font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:20px 22px 28px;overflow-wrap:anywhere;}
  img{max-width:100%;height:auto;}
  table{max-width:100%;}
  a{color:#1c64d6;}
  blockquote{margin:0 0 0 .6em;padding-left:.8em;border-left:3px solid #ddd;color:#555;}
  .plain{white-space:pre-wrap;}
</style></head><body>${body}</body></html>`
  }, [html, text, allowRemote])

  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    let ro: ResizeObserver | null = null
    const measure = () => {
      const d = frame.contentDocument
      if (d?.body) setHeight(Math.max(120, d.documentElement.scrollHeight))
    }
    const onLoad = () => {
      measure()
      const d = frame.contentDocument
      if (d?.body) {
        ro = new ResizeObserver(measure)
        ro.observe(d.body)
        d.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure))
      }
    }
    frame.addEventListener('load', onLoad)
    return () => {
      frame.removeEventListener('load', onLoad)
      ro?.disconnect()
    }
  }, [doc])

  return (
    <iframe
      ref={ref}
      className="email-frame"
      title="Email content"
      // allow-same-origin (without allow-scripts) lets us measure height; no script can run.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      style={{ height }}
    />
  )
}
