"use client"

import { useState, useEffect } from "react"
import { getColaboradores, getVeiculosDisponiveis, validarPin, agendarVeiculo } from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"
import { clientStore } from "@/lib/clientStore"

export default function AgendarModal({ onClose }: { onClose: () => void }) {
  const { showAlert } = useDialog()
  const [step, setStep] = useState(1) // 1: Veículo, 2: Datas, 3: Colab, 4: PIN
  const [veiculos, setVeiculos] = useState<any[]>(clientStore.loaded ? clientStore.veiculosDisponiveis : [])
  const [colaboradores, setColaboradores] = useState<any[]>(clientStore.loaded ? clientStore.colaboradores : [])
  
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null)
  const [selectedColab, setSelectedColab] = useState<any>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(!clientStore.loaded)

  const [dataInicio, setDataInicio] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [horaFim, setHoraFim] = useState("")

  useEffect(() => {
    if (!clientStore.loaded) {
      Promise.all([
        getVeiculosDisponiveis(),
        getColaboradores()
      ]).then(([veic, colab]) => {
        setVeiculos(veic)
        setColaboradores(colab)
        setLoadingData(false)
      })
    }
  }, [])

  const handlePinComplete = async (pin: string) => {
    setLoading(true)
    const res = await validarPin(selectedColab.id, pin)
    
    if (!res.success) {
      setPinError(res.error || "Erro")
      setLoading(false)
      return
    }

    // Se o PIN for válido, tenta agendar
    const dtInicio = new Date(`${dataInicio}T${horaInicio}`)
    const dtFim = new Date(`${dataFim}T${horaFim}`)

    const agendarRes = await agendarVeiculo(selectedVeiculo.id, selectedColab.id, dtInicio, dtFim)
    setLoading(false)

    if (agendarRes.success) {
      await showAlert("Veículo agendado com sucesso!")
      onClose()
    } else {
      await showAlert("Erro: " + agendarRes.error)
      setStep(2) // Volta pra tela de data
    }
  }

  const validarDatas = async () => {
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
      await showAlert("Preencha todas as datas e horários.")
      return
    }
    const dtInicio = new Date(`${dataInicio}T${horaInicio}`)
    const dtFim = new Date(`${dataFim}T${horaFim}`)
    const agora = new Date()

    if (dtInicio < agora) {
      await showAlert("O horário de início não pode ser no passado.")
      return
    }

    if (dtFim <= dtInicio) {
      await showAlert("O horário de devolução deve ser posterior ao horário de retirada.")
      return
    }

    setStep(3)
  }

  return (
    <div className="modal-overlay">
      {step === 1 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Qual Veículo deseja agendar?</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Carregando veículos...
            </div>
          ) : (
            <div className="responsive-grid-2">
              {veiculos.map(v => (
                <div 
                  key={v.id} 
                  className="list-item"
                  onClick={() => { setSelectedVeiculo(v); setStep(2) }}
                >
                  <div>
                    <div className="list-item-title">{v.placa}</div>
                    <div className="list-item-subtitle">Modelo: {v.modelo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Período de Agendamento</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          
          <div className="responsive-grid-2" style={{ gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Retirada</label>
              <input 
                type="date" 
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                style={{ width: '100%', padding: '16px', fontSize: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '12px' }}
              />
              <input 
                type="time" 
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                style={{ width: '100%', padding: '16px', fontSize: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Devolução</label>
              <input 
                type="date" 
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                style={{ width: '100%', padding: '16px', fontSize: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '12px' }}
              />
              <input 
                type="time" 
                value={horaFim}
                onChange={e => setHoraFim(e.target.value)}
                style={{ width: '100%', padding: '16px', fontSize: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ padding: '24px', fontSize: '1.5rem', marginTop: '16px' }}
            onClick={validarDatas}
          >
            CONTINUAR
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Quem está agendando?</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          <div className="responsive-grid-2">
            {colaboradores.map(c => (
              <div 
                key={c.id} 
                className="list-item"
                onClick={() => { setSelectedColab(c); setStep(4) }}
              >
                <div>
                  <div className="list-item-title">{c.nome}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <VirtualNumpad 
          title={`PIN para ${selectedColab.nome}`}
          onComplete={handlePinComplete}
          onCancel={() => { setStep(3); setPinError(null) }}
          error={pinError}
          loading={loading}
        />
      )}
    </div>
  )
}
