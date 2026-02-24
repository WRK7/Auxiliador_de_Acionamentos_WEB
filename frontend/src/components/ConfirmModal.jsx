import './ConfirmModal.css'

/**
 * Modal customizado (substitui window.alert e window.confirm).
 * @param {boolean} open
 * @param {string} title
 * @param {string} message
 * @param {'alert'|'confirm'} [mode='confirm'] - alert = só botão OK; confirm = OK + Cancelar
 * @param {string} [confirmLabel='OK']
 * @param {string} [cancelLabel='Cancelar']
 * @param {'default'|'danger'|'warning'} [variant='default']
 * @param {() => void} onConfirm
 * @param {() => void} [onCancel]
 */
export default function ConfirmModal({
  open,
  title,
  message,
  mode = 'confirm',
  confirmLabel = 'OK',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const variantClass =
    variant === 'danger' ? 'confirm-modal-btn-danger'
    : variant === 'warning' ? 'confirm-modal-btn-warning'
    : ''

  return (
    <div className="confirm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="confirm-modal-card">
        {variant === 'danger' && <div className="confirm-modal-icon confirm-modal-icon--danger">!</div>}
        {variant === 'warning' && <div className="confirm-modal-icon confirm-modal-icon--warning">!</div>}
        <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          {mode === 'confirm' && onCancel && (
            <button type="button" className="confirm-modal-btn confirm-modal-btn-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`confirm-modal-btn confirm-modal-btn-confirm ${variantClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
