"use client"

import { useState, useEffect } from "react"

interface VirtualNumpadProps {
  onComplete: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  error?: string | null;
  loading?: boolean;
}

export default function VirtualNumpad({ onComplete, onCancel, title = "Digite seu PIN", error, loading }: VirtualNumpadProps) {
  const [pin, setPin] = useState<string>("")

  useEffect(() => {
    if (error) {
      setPin("")
    }
  }, [error])

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      if (newPin.length === 4) {
        // Delay slight to let user see the 4th dot filled
        setTimeout(() => {
          onComplete(newPin)
        }, 150)
      }
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
  }

  const handleClear = () => {
    setPin("")
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ fontSize: '1.5rem' }}>{title}</h2>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '1.25rem', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '16px', fontSize: '2.5rem' }}>⏳</div>
            Processando...
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <div className="pin-display">
              {[1, 2, 3, 4].map((index) => (
                <div 
                  key={index} 
                  className={`pin-dot ${pin.length >= index ? 'filled' : ''}`}
                />
              ))}
            </div>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontWeight: 600 }}>{error}</div>}

            <div className="numpad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  className="numpad-btn"
                  onClick={() => handlePress(num.toString())}
                >
                  {num}
                </button>
              ))}
              <button className="numpad-btn" onClick={handleClear} style={{ color: 'var(--danger)', fontSize: '1.25rem' }}>
                Limpar
              </button>
              <button className="numpad-btn" onClick={() => handlePress("0")}>
                0
              </button>
              <button className="numpad-btn" onClick={handleDelete} style={{ fontSize: '1.5rem' }}>
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
