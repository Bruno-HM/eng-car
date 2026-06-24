"use client"

import { useState, useEffect } from "react"
import { getColaboradores, validarPin, retirarVeiculo, getAgendamentoAtualColaborador, getVeiculosDisponiveisParaColaborador } from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"

export default function RetirarModal({ onClose }: { onClose: () => void }) {
  const { showAlert } = useDialog()
  const [step, setStep] = useState(1) // 1: Colaborador, 2: PIN, 3: Veículo
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [selectedColab, setSelectedColab] = useState<any>(null)
  const [agendamentoColab, setAgendamentoColab] = useState<any>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getColaboradores().then(setColaboradores)
  }, [])

  const handlePinComplete = async (pin: string) => {
    setLoading(true)
    const res = await validarPin(selectedColab.id, pin)
    
    if (res.success) {
      const agendamento = await getAgendamentoAtualColaborador(selectedColab.id)
      setAgendamentoColab(agendamento)
      
      const disponiveis = await getVeiculosDisponiveisParaColaborador(selectedColab.id)
      setVeiculos(disponiveis)

      setPinError(null)
      setStep(3)
    } else {
      setPinError(res.error || "Erro")
    }
    setLoading(false)
  }

  const handleSelectVeiculo = async (veiculoId: string) => {
    setLoading(true)
    const res = await retirarVeiculo(selectedColab.id, veiculoId)
    setLoading(false)
    if (res.success) {
      await showAlert("Veículo retirado com sucesso!")
      onClose()
    } else {
      await showAlert("Erro: " + res.error)
    }
  }

  return (
    <div className="modal-overlay">
      {step === 1 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Quem está retirando?</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          <div className="responsive-grid-2">
            {colaboradores.map(c => (
              <div 
                key={c.id} 
                className="list-item"
                onClick={() => { setSelectedColab(c); setStep(2) }}
              >
                <div>
                  <div className="list-item-title">{c.nome}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <VirtualNumpad 
          title={`PIN para ${selectedColab.nome}`}
          onComplete={handlePinComplete}
          onCancel={() => { setStep(1); setPinError(null) }}
          error={pinError}
        />
      )}

      {step === 3 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Selecione o Veículo</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Processando...</div>
          ) : agendamentoColab ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '1.25rem', textAlign: 'center' }}>
                Olá, <strong>{selectedColab.nome}</strong>! Identificamos que você agendou o seguinte veículo para hoje:
              </p>
              
              <button 
                className="giant-button" 
                style={{ width: '100%', maxWidth: '500px', height: 'auto', padding: '32px' }}
                onClick={() => handleSelectVeiculo(agendamentoColab.veiculo.id)}
              >
                <span style={{ fontSize: '3rem' }}>🚗</span>
                <h3 style={{ margin: '12px 0 6px 0' }}>{agendamentoColab.veiculo.placa}</h3>
                <p style={{ margin: 0, opacity: 0.8 }}>Modelo: {agendamentoColab.veiculo.modelo} | KM: {agendamentoColab.veiculo.kmAtual}</p>
                <div style={{ marginTop: '20px', background: 'white', color: 'var(--primary)', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '1.25rem' }}>
                  CLIQUE AQUI PARA RETIRAR
                </div>
              </button>

              <button 
                className="btn" 
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', marginTop: '10px' }}
                onClick={() => setAgendamentoColab(null)}
              >
                Escolher outro veículo disponível
              </button>
            </div>
          ) : veiculos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.25rem' }}>Nenhum veículo disponível.</div>
          ) : (
            <div className="responsive-grid-2">
              {veiculos.map(v => (
                <div 
                  key={v.id} 
                  className="list-item"
                  onClick={() => handleSelectVeiculo(v.id)}
                >
                  <div>
                    <div className="list-item-title">{v.placa}</div>
                    <div className="list-item-subtitle">Modelo: {v.modelo} | KM: {v.kmAtual}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
