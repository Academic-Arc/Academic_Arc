import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import './PromptModal.css'

const PromptContext = createContext(null)

// Global references for fallback access outside react hooks
let globalShowAlert = null
let globalShowConfirm = null
let globalShowToast = null

export const customAlert = (...args) => {
  if (globalShowAlert) return globalShowAlert(...args)
  return Promise.resolve()
}

export const customConfirm = (...args) => {
  if (globalShowConfirm) return globalShowConfirm(...args)
  return Promise.resolve(false)
}

export const customToast = (...args) => {
  if (globalShowToast) return globalShowToast(...args)
}

export function PromptProvider({ children }) {
  const [modalState, setModalState] = useState(null)
  const [toasts, setToasts] = useState([])
  const primaryBtnRef = useRef(null)

  // Format message from error objects, arrays, or objects
  const formatMessage = (msg) => {
    if (!msg) return ''
    if (typeof msg === 'string') return msg
    if (msg instanceof Error) return msg.message
    if (typeof msg === 'object') {
      if (typeof msg.detail === 'string') return msg.detail
      if (Array.isArray(msg.detail)) {
        return msg.detail
          .map((item) => (typeof item === 'string' ? item : item.msg || JSON.stringify(item)))
          .join('\n')
      }
      try {
        return JSON.stringify(msg, null, 2)
      } catch {
        return String(msg)
      }
    }
    return String(msg)
  }

  // --- SHOW ALERT ---
  const showAlert = useCallback((messageOrOptions, type = 'info') => {
    return new Promise((resolve) => {
      let options = {}
      if (typeof messageOrOptions === 'object' && !(messageOrOptions instanceof Error) && messageOrOptions.message) {
        options = { ...messageOrOptions }
      } else {
        options = {
          message: formatMessage(messageOrOptions),
          type: type || 'info'
        }
      }

      const alertType = options.type || 'info'
      let defaultTitle = 'Notice'
      if (alertType === 'error') defaultTitle = 'Error'
      else if (alertType === 'success') defaultTitle = 'Success'
      else if (alertType === 'warning') defaultTitle = 'Attention'

      setModalState({
        isOpen: true,
        isConfirm: false,
        type: alertType,
        title: options.title || defaultTitle,
        message: formatMessage(options.message),
        confirmText: options.confirmText || options.buttonText || 'OK',
        resolve: (val) => {
          setModalState(null)
          resolve(val)
        }
      })
    })
  }, [])

  // --- SHOW CONFIRM ---
  const showConfirm = useCallback((messageOrOptions, defaultType = 'warning') => {
    return new Promise((resolve) => {
      let options = {}
      if (typeof messageOrOptions === 'object' && !(messageOrOptions instanceof Error) && messageOrOptions.message) {
        options = { ...messageOrOptions }
      } else {
        const rawMessage = formatMessage(messageOrOptions)
        const isDestructive = /\b(delete|remove|destroy|revoke|disconnect|discard)\b/i.test(rawMessage)
        options = {
          message: rawMessage,
          type: isDestructive ? 'danger' : defaultType,
          confirmText: isDestructive ? 'Delete' : 'Confirm',
          cancelText: 'Cancel'
        }
      }

      const confirmType = options.type || (/\b(delete|remove)\b/i.test(options.message) ? 'danger' : 'warning')
      let defaultTitle = 'Confirm Action'
      if (confirmType === 'danger') defaultTitle = 'Are you sure?'
      else if (confirmType === 'warning') defaultTitle = 'Please Confirm'

      setModalState({
        isOpen: true,
        isConfirm: true,
        type: confirmType,
        title: options.title || defaultTitle,
        message: formatMessage(options.message),
        confirmText: options.confirmText || (confirmType === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: options.cancelText || 'Cancel',
        resolve: (val) => {
          setModalState(null)
          resolve(val)
        }
      })
    })
  }, [])

  // --- SHOW TOAST ---
  const showToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    const toast = {
      id,
      message: formatMessage(message),
      type: type || 'info'
    }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Bind globals
  useEffect(() => {
    globalShowAlert = showAlert
    globalShowConfirm = showConfirm
    globalShowToast = showToast
    window.customAlert = showAlert
    window.customConfirm = showConfirm
    window.customToast = showToast

    return () => {
      globalShowAlert = null
      globalShowConfirm = null
      globalShowToast = null
    }
  }, [showAlert, showConfirm, showToast])

  // Scroll lock and focus handling
  useEffect(() => {
    if (modalState?.isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      // Focus primary button
      setTimeout(() => {
        if (primaryBtnRef.current) {
          primaryBtnRef.current.focus()
        }
      }, 50)

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          modalState.resolve(false)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          modalState.resolve(true)
        }
      }

      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = prevOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [modalState])

  // Render SVG icons according to prompt type
  const renderIcon = (type) => {
    switch (type) {
      case 'danger':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        )
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        )
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      case 'info':
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )
    }
  }

  const renderToastIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        )
      case 'warning':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        )
      case 'info':
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )
    }
  }

  return (
    <PromptContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}

      {/* MODAL PROMPT DIALOG */}
      {modalState?.isOpen && (
        <div
          className="arc-prompt-overlay"
          onClick={() => {
            // Clicking overlay cancels/closes
            modalState.resolve(false)
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="arc-prompt-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="arc-prompt-close-btn"
              onClick={() => modalState.resolve(false)}
              aria-label="Close dialog"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className={`arc-prompt-icon-badge ${modalState.type}`}>
              {renderIcon(modalState.type)}
            </div>

            <div className="arc-prompt-content">
              <h3 className="arc-prompt-title">{modalState.title}</h3>
              <p className="arc-prompt-message">{modalState.message}</p>
            </div>

            <div className="arc-prompt-actions">
              {modalState.isConfirm && (
                <button
                  type="button"
                  className="arc-prompt-btn arc-prompt-btn-cancel"
                  onClick={() => modalState.resolve(false)}
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                ref={primaryBtnRef}
                type="button"
                className={`arc-prompt-btn arc-prompt-btn-confirm ${modalState.type}`}
                onClick={() => modalState.resolve(true)}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONTAINER */}
      {toasts.length > 0 && (
        <div className="arc-toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`arc-toast-pill ${toast.type}`}>
              <div className="arc-toast-icon">
                {renderToastIcon(toast.type)}
              </div>
              <span className="arc-toast-message">{toast.message}</span>
              <button
                type="button"
                className="arc-toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss toast"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </PromptContext.Provider>
  )
}

export function usePrompt() {
  const context = useContext(PromptContext)
  if (!context) {
    return {
      showAlert: customAlert,
      showConfirm: customConfirm,
      showToast: customToast
    }
  }
  return context
}
