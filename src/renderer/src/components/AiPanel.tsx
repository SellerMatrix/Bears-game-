import { useEffect, useRef, useState } from 'react'
import { errorText, newRequestId } from '../format'
import { IconSparkle, IconX } from './Icons'

/** Streams a Claude summary of the open thread. */
export function AiSummary({ messageId, onClose }: { messageId: number; onClose: () => void }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = useState('')
  const reqId = useRef(newRequestId())

  useEffect(() => {
    const id = reqId.current
    const off = window.api.onAi((e) => {
      if (e.requestId !== id) return
      if (e.type === 'delta') setText((t) => t + e.text)
      else if (e.type === 'done') setState('done')
      else { setState('error'); setError(e.error) }
    })
    window.api.summarize(messageId, id).catch((err) => { setState('error'); setError(errorText(err)) })
    return () => { off(); void window.api.cancelAi(id) }
  }, [messageId])

  const lines = text.split('\n').filter((l) => l.trim())
  return (
    <div className="ai-card">
      <div className="ai-head">
        <IconSparkle /> <span>Summary</span>
        {state === 'loading' && <span className="pulse">thinking…</span>}
        <button className="mini" onClick={onClose} title="Close"><IconX /></button>
      </div>
      {state === 'error' ? (
        <div className="ai-error">{error}</div>
      ) : (
        <div className="ai-body">
          {lines.map((l, i) =>
            l.startsWith('Action:') ? (
              <div key={i} className={`ai-action ${/none\.?$/i.test(l) ? 'none' : ''}`}>{l}</div>
            ) : (
              <div key={i} className="ai-line">{l.replace(/^[-•*]\s*/, '• ')}</div>
            )
          )}
        </div>
      )}
    </div>
  )
}
