"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

type DialogOptions = {
  message: string;
  type: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

interface DialogContextProps {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<DialogOptions[]>([])

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setDialogs((prev) => [...prev, { message, type: 'alert', resolve: () => resolve() }])
    })
  }

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogs((prev) => [...prev, { message, type: 'confirm', resolve }])
    })
  }

  const handleClose = (index: number, result: boolean) => {
    const dialog = dialogs[index]
    if (dialog) {
      dialog.resolve(result)
    }
    setDialogs((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialogs.map((dialog, index) => (
        <div key={index} className="modal-overlay" style={{ zIndex: 9999 + index }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px', gap: '24px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{dialog.message}</div>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
              {dialog.type === 'confirm' && (
                <button 
                  className="btn" 
                  style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: 1 }}
                  onClick={() => handleClose(index, false)}
                >
                  Cancelar
                </button>
              )}
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => handleClose(index, true)}
              >
                {dialog.type === 'confirm' ? 'Confirmar' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
