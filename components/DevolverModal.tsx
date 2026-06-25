"use client"

import { useState, useEffect } from "react"
import { getTodosVeiculos, validarPin, devolverVeiculo } from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"
import { clientStore } from "@/lib/clientStore"

export default function DevolverModal({ onClose }: { onClose: () => void }) {
  const { showAlert, showConfirm } = useDialog()
  const [step, setStep] = useState(1) // 1: Veículo, 2: PIN, 3: Form (KM, Combustível, Avarias)
  const [veiculos, setVeiculos] = useState<any[]>(clientStore.loaded ? clientStore.veiculos.filter((v: any) => v.status === 'EM_USO') : [])
  
  const [selectedColab, setSelectedColab] = useState<any>(null)
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingVeiculos, setLoadingVeiculos] = useState(!clientStore.loaded)

  // Form State
  const [kmInformado, setKmInformado] = useState<string>("")
  const [combustivel, setCombustivel] = useState<string>("Cheio")
  const [avarias, setAvarias] = useState<Record<string, boolean>>({
    'Luz Queimada': false,
    'Pneu Murcho': false,
    'Risco na Lataria': false,
    'Vidro Trincado': false,
    'Interior Sujo': false
  })

  useEffect(() => {
    if (!clientStore.loaded) {
      getTodosVeiculos().then(res => {
        const emUso = res.filter(v => v.status === 'EM_USO')
        setVeiculos(emUso)
        setLoadingVeiculos(false)
      })
    }
  }, [])

  const handlePinComplete = async (pin: string) => {
    setLoading(true)
    if (!selectedColab) {
      setPinError("Nenhum motorista associado a este carro.")
      setLoading(false)
      return
    }

    const res = await validarPin(selectedColab.id, pin)
    
    if (res.success) {
      setPinError(null)
      setStep(3)
    } else {
      setPinError(res.error || "Erro")
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    const kmNum = parseInt(kmInformado)
    if (isNaN(kmNum) || kmNum < selectedVeiculo.kmAtual) {
      await showAlert(`O KM informado deve ser maior ou igual ao atual (${selectedVeiculo.kmAtual}).`)
      return
    }

    const hasAvarias = Object.values(avarias).some(v => v)
    if (hasAvarias) {
      const confirmAvaria = await showConfirm("Atenção: Avarias foram marcadas. Um alerta será registrado. Deseja continuar?")
      if (!confirmAvaria) return
    }

    const avariasAtivas = Object.entries(avarias)
      .filter(([_, checked]) => checked)
      .map(([k]) => k)

    setLoading(true)
    const res = await devolverVeiculo(
      selectedColab.id,
      selectedVeiculo.id,
      kmNum,
      combustivel,
      avariasAtivas.length > 0 ? JSON.stringify(avariasAtivas) : "{}"
    )
    setLoading(false)

    if (res.success) {
      await showAlert("Veículo devolvido com sucesso!")
      onClose()
    } else {
      await showAlert("Erro: " + res.error)
    }
  }

  const toggleAvaria = (k: string) => {
    setAvarias(prev => ({ ...prev, [k]: !prev[k] }))
  }

  return (
    <div className="modal-overlay">
      {step === 1 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Qual veículo está devolvendo?</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          {loadingVeiculos ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Carregando veículos...
            </div>
          ) : veiculos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.25rem', color: 'var(--text-muted)' }}>
              Nenhum veículo em uso no momento.
            </div>
          ) : (
            <div className="responsive-grid-2">
              {veiculos.map(v => {
                const colab = v.logs && v.logs.length > 0 ? v.logs[0].colaborador : null;
                return (
                  <div 
                    key={v.id} 
                    className="list-item"
                    onClick={() => {
                      if (!colab) {
                        showAlert("Não foi possível identificar o motorista ativo deste veículo.")
                        return
                      }
                      setSelectedVeiculo(v)
                      setSelectedColab(colab)
                      setKmInformado(v.kmAtual.toString())
                      setStep(2)
                    }}
                  >
                    <div>
                      <div className="list-item-title">{v.placa} - {v.modelo}</div>
                      {colab ? (
                        <div className="list-item-subtitle" style={{ color: 'var(--primary)', marginTop: '4px' }}>
                          Com: {colab.nome}
                        </div>
                      ) : (
                        <div className="list-item-subtitle" style={{ color: 'var(--danger)', marginTop: '4px' }}>
                          Motorista não identificado
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <VirtualNumpad 
          title={`PIN de ${selectedColab?.nome}`}
          onComplete={handlePinComplete}
          onCancel={() => { setStep(1); setPinError(null) }}
          error={pinError}
          loading={loading}
        />
      )}

      {step === 3 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Checklist de Devolução</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* KM */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Quilometragem (KM Atual: {selectedVeiculo.kmAtual})</label>
              <input 
                type="number" 
                value={kmInformado}
                onChange={e => setKmInformado(e.target.value)}
                style={{ width: '100%', padding: '16px', fontSize: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
              />
            </div>

            {/* Combustível */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Nível de Combustível</label>
              <div className="fuel-grid">
                {['Vazio', '1/4', 'Meio', '3/4', 'Cheio'].map(lvl => (
                  <button 
                    key={lvl}
                    className="btn"
                    style={{ 
                      flex: 1, 
                      backgroundColor: combustivel === lvl ? 'var(--primary)' : 'var(--surface-hover)',
                      color: combustivel === lvl ? '#FFFFFF' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      padding: '12px 4px',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      fontWeight: combustivel === lvl ? 600 : 400
                    }}
                    onClick={() => setCombustivel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Avarias */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Avarias (Marque se houver problemas)</label>
              <div className="responsive-grid-2" style={{ gap: '12px' }}>
                {Object.keys(avarias).map(k => (
                  <label key={k} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
                    border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer',
                    backgroundColor: avarias[k] ? 'var(--danger-glow)' : 'var(--surface)',
                    borderColor: avarias[k] ? 'var(--danger)' : 'var(--border)'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={avarias[k]}
                      onChange={() => toggleAvaria(k)}
                      style={{ width: '24px', height: '24px' }}
                    />
                    <span style={{ fontSize: '1.125rem', fontWeight: 500, color: avarias[k] ? 'var(--danger)' : 'var(--text-main)' }}>{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ padding: '20px', fontSize: '1.25rem', marginTop: '16px', whiteSpace: 'normal', lineHeight: '1.3' }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'PROCESSANDO...' : 'CONFIRMAR DEVOLUÇÃO'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
