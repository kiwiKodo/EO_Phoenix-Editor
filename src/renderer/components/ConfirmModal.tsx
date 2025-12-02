import React from 'react'

type ConfirmModalProps = {
  open: boolean
  title?: string
  message?: React.ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmText = 'OK', cancelText = 'Cancel', danger = false, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modalBox">
        {title ? <h3>{title}</h3> : null}
        <div style={{ whiteSpace: 'pre-wrap' }}>{message}</div>
        <div className="modalActions">
          <button onClick={async () => { try { await onConfirm() } catch (e) { /* ignore */ } }} className={danger ? 'danger' : undefined}>{confirmText}</button>
          <button onClick={() => onCancel()}>{cancelText}</button>
        </div>
      </div>
    </div>
  )
}
