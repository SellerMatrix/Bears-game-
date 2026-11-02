import type { ReactNode } from 'react'
import { IconX } from './Icons'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="mini" onClick={onClose} title="Close"><IconX /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
