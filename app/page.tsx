"use client"

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { getAgenda } from '@/app/actions'
import RetirarModal from '@/components/RetirarModal'
import DevolverModal from '@/components/DevolverModal'
import AgendarModal from '@/components/AgendarModal'
import AdminModal from '@/components/AdminModal'
import CancelarAgendamentoModal from '@/components/CancelarAgendamentoModal'
import PorteiroModal from '@/components/PorteiroModal'
import logoGrupoeng from '@/assets/logo-grupoeng.png'
import { preloadData } from '@/lib/clientStore'

// Componente para lidar com Auto-Timeout
function TimeoutWrapper({ children, onTimeout }: { children: React.ReactNode, onTimeout: () => void }) {
  useEffect(() => {
    let timer = setTimeout(onTimeout, 45000) // 45 segundos de inatividade reseta

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(onTimeout, 45000)
    }

    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('click', resetTimer)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('touchstart', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('click', resetTimer)
    }
  }, [onTimeout])

  return <>{children}</>
}

export default function Home() {
  const [time, setTime] = useState<Date | null>(null)
  const [agenda, setAgenda] = useState<any[]>([])
  const [errorLog, setErrorLog] = useState<string | null>(null)

  const [activeModal, setActiveModal] = useState<'RETIRAR' | 'DEVOLVER' | 'AGENDAR' | 'ADMIN' | 'PORTEIRO' | null>(null)
  const [cancelingAgendamento, setCancelingAgendamento] = useState<any>(null)

  const lastClickTimeRef = useRef<number>(0)

  const handleLogoClick = () => {
    const now = Date.now()
    if (now - lastClickTimeRef.current < 300) {
      openModal('ADMIN')
    }
    lastClickTimeRef.current = now
  }

  const openModal = (modalName: 'RETIRAR' | 'DEVOLVER' | 'AGENDAR' | 'ADMIN' | 'PORTEIRO') => {
    if (activeModal !== null || cancelingAgendamento !== null) {
      window.history.replaceState({ isModal: true }, '')
    } else {
      window.history.pushState({ isModal: true }, '')
    }
    setActiveModal(modalName)
  }

  const openCanceling = (agendamento: any) => {
    if (activeModal !== null || cancelingAgendamento !== null) {
      window.history.replaceState({ isModal: true }, '')
    } else {
      window.history.pushState({ isModal: true }, '')
    }
    setCancelingAgendamento(agendamento)
  }

  const loadAgenda = () => {
    getAgenda()
      .then(setAgenda)
      .catch((err) => {
        setErrorLog("Erro ao carregar agenda: " + err.message)
      })
  }

  const formatAgendaTime = (dateInput: any) => {
    try {
      if (!dateInput) return '--:--'
      const d = new Date(dateInput)
      if (isNaN(d.getTime())) return '--:--'
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '--:--'
    }
  }

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      setErrorLog(event.message + '\n' + event.filename + ':' + event.lineno)
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      setErrorLog('Rejection: ' + String(event.reason))
    }
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleRejection)

    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    loadAgenda()
    preloadData()
    
    // Atualiza agenda e cache a cada minuto
    const agendaTimer = setInterval(() => {
      loadAgenda()
      preloadData()
    }, 60000)

    const handlePopState = () => {
      setActiveModal(null)
      setCancelingAgendamento(null)
      loadAgenda()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleRejection)
      window.removeEventListener('popstate', handlePopState)
      clearInterval(timer)
      clearInterval(agendaTimer)
    }
  }, [])

  const handleCloseModal = () => {
    if (window.history.state && window.history.state.isModal) {
      window.history.back() // triggers popstate which will close the modal
    } else {
      setActiveModal(null)
      setCancelingAgendamento(null)
      loadAgenda()
    }
  }

  return (
    <div className="layout-container">
      {errorLog && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderBottom: '2px solid #f87171', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Erro Detectado no Celular:</div>
          <div>{errorLog}</div>
          <button onClick={() => setErrorLog(null)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Fechar</button>
        </div>
      )}

      {/* Sidebar - Agenda */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span style={{color: 'var(--primary)', textShadow: '0 0 12px var(--primary-glow)'}}>⚡</span> Hoje
        </div>
        <div className="agenda-list">
          {agenda.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
              Nenhum agendamento para hoje.
            </div>
          ) : (
            agenda.map(a => {
              const start = formatAgendaTime(a.dataHoraInicio)
              const end = formatAgendaTime(a.dataHoraFim)
              return (
                <div key={a.id} className="agenda-card">
                  <div>
                    <div className="agenda-time">{start} - {end}</div>
                    <div className="agenda-user">{a.colaborador.nome}</div>
                    <div className="agenda-car">{a.veiculo.placa} ({a.veiculo.modelo})</div>
                  </div>
                  <button
                    className="agenda-cancel-btn"
                    onClick={() => openCanceling(a)}
                    title="Cancelar agendamento"
                  >
                    ×
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-content">
        <div className="header">
          <div className="logo-area" onClick={handleLogoClick}>
            <Image src="/logo-grupoeng.png" alt="grupoeng Logo" width={500} height={140} className="logo-image" priority />
          </div>
          <div className="time-display">
            {time ? time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
        </div>

        <div className="action-grid">
          <button className="giant-button primary" onClick={() => openModal('RETIRAR')}>
            <div className="icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
            <div className="giant-button-info">
              <span>RETIRAR</span>
              <p>Autenticar e liberar veículo</p>
            </div>
          </button>

          <button className="giant-button secondary" onClick={() => openModal('DEVOLVER')}>
            <div className="icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
            </div>
            <div className="giant-button-info">
              <span>DEVOLVER</span>
              <p>Registrar KM e encerrar uso</p>
            </div>
          </button>

          <button className="giant-button danger" onClick={() => openModal('AGENDAR')}>
            <div className="icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div className="giant-button-info">
              <span>AGENDAR</span>
              <p>Reservar para uso futuro</p>
            </div>
          </button>
        </div>

        {activeModal === 'RETIRAR' && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <RetirarModal onClose={handleCloseModal} />
          </TimeoutWrapper>
        )}

        {activeModal === 'DEVOLVER' && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <DevolverModal onClose={handleCloseModal} />
          </TimeoutWrapper>
        )}

        {activeModal === 'AGENDAR' && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <AgendarModal onClose={handleCloseModal} />
          </TimeoutWrapper>
        )}

        {activeModal === 'ADMIN' && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <AdminModal onClose={handleCloseModal} onOpenPorteiro={() => openModal('PORTEIRO')} />
          </TimeoutWrapper>
        )}

        {activeModal === 'PORTEIRO' && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <PorteiroModal onClose={handleCloseModal} />
          </TimeoutWrapper>
        )}

        {cancelingAgendamento && (
          <TimeoutWrapper onTimeout={handleCloseModal}>
            <CancelarAgendamentoModal
              agendamento={cancelingAgendamento}
              onClose={handleCloseModal}
            />
          </TimeoutWrapper>
        )}

      </main>
    </div>
  )
}
