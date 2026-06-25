"use client"

import { useState, useEffect } from "react"
import { getDevolucoesPendentes, confirmarDevolucaoPorteiro } from "@/app/actions"
import { useDialog } from "@/components/DialogContext"

const OPCOES_COMBUSTIVEL = ["Cheio", "3/4", "Meio", "1/4", "Reserva"]
const AVARIAS_COMUNS = ["Risco Lateral", "Parachoque Amassado", "Lente de Farol Quebrada", "Pneu Murcho/Furado", "Sujeira Interna Extrema"]

export default function PorteiroModal({ onClose }: { onClose: () => void }) {
  const { showAlert } = useDialog()
  const [devolucoes, setDevolucoes] = useState<any[]>([])
  const [selectedDev, setSelectedDev] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Campos de edição do Porteiro
  const [kmFinal, setKmFinal] = useState<number>(0)
  const [combustivelFinal, setCombustivelFinal] = useState<string>("Cheio")
  const [avariasSelecionadas, setAvariasSelecionadas] = useState<string[]>([])
  const [customAvaria, setCustomAvaria] = useState<string>("")
  const [enviarParaManutencao, setEnviarParaManutencao] = useState<boolean>(false)

  const loadDevolucoes = async () => {
    setLoading(true)
    const data = await getDevolucoesPendentes()
    setDevolucoes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadDevolucoes()
  }, [])

  const handleSelectDev = (dev: any) => {
    setSelectedDev(dev)
    setKmFinal(dev.kmDeclarado)
    setCombustivelFinal(dev.combustivelDeclarado)
    
    // Parse avarias declaradas pelo colaborador
    let avariasArray: string[] = []
    if (dev.avariasDeclaradasJson) {
      try {
        const parsed = JSON.parse(dev.avariasDeclaradasJson)
        if (Array.isArray(parsed)) {
          avariasArray = parsed
        }
      } catch {
        avariasArray = []
      }
    }
    setAvariasSelecionadas(avariasArray)
    
    // Se o colaborador já declarou avarias, pré-seleciona "Enviar para Manutenção"
    setEnviarParaManutencao(avariasArray.length > 0)
  }

  const toggleAvaria = (av: string) => {
    if (avariasSelecionadas.includes(av)) {
      setAvariasSelecionadas(avariasSelecionadas.filter(item => item !== av))
    } else {
      setAvariasSelecionadas([...avariasSelecionadas, av])
    }
  }

  const addCustomAvaria = () => {
    if (customAvaria.trim()) {
      if (!avariasSelecionadas.includes(customAvaria.trim())) {
        setAvariasSelecionadas([...avariasSelecionadas, customAvaria.trim()])
      }
      setCustomAvaria("")
      setEnviarParaManutencao(true) // assume que avarias adicionadas exigem manutenção
    }
  }

  const handleConfirmar = async () => {
    if (!selectedDev) return
    if (kmFinal < selectedDev.veiculo.kmAtual) {
      await showAlert(`O KM final não pode ser menor que o KM atual do veículo: ${selectedDev.veiculo.kmAtual}`)
      return
    }

    setLoading(true)
    const res = await confirmarDevolucaoPorteiro(
      selectedDev.id,
      kmFinal,
      combustivelFinal,
      JSON.stringify(avariasSelecionadas),
      enviarParaManutencao
    )
    setLoading(false)

    if (res.success) {
      await showAlert("Devolução confirmada com sucesso! O veículo foi liberado.")
      setSelectedDev(null)
      loadDevolucoes()
    } else {
      await showAlert("Erro: " + res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: selectedDev ? '750px' : '650px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {selectedDev ? `Conferir Entrada: ${selectedDev.veiculo.placa} - ${selectedDev.veiculo.modelo}` : "Portaria: Devoluções Pendentes"}
          </h2>
          <button className="btn-close" onClick={selectedDev ? () => setSelectedDev(null) : onClose}>
            {selectedDev ? "Voltar" : "×"}
          </button>
        </div>

        {loading && devolucoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Carregando devoluções...</div>
        ) : !selectedDev ? (
          // LISTAGEM DE DEVOLUÇÕES PENDENTES
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {devolucoes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum veículo aguardando conferência do porteiro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {devolucoes.map(d => {
                  const dataFormat = new Date(d.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <button key={d.id} className="list-item" onClick={() => handleSelectDev(d)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div className="list-item-title">{d.veiculo.placa} - {d.veiculo.modelo}</div>
                          <div className="list-item-subtitle">
                            Motorista: {d.colaborador.nome} | Entregue às {dataFormat}
                          </div>
                        </div>
                        <div className="badge-pending">Conferir 🔎</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          // DETALHES E AJUSTES DA DEVOLUÇÃO
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* INFORMAÇÕES DECLARADAS */}
            <div className="info-box">
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Dados Declarados pelo Motorista</h4>
              <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '1rem' }}>
                <div><strong>KM:</strong> {selectedDev.kmDeclarado}</div>
                <div><strong>Combustível:</strong> {selectedDev.combustivelDeclarado}</div>
                <div>
                  <strong>Avarias:</strong>{" "}
                  {selectedDev.avariasDeclaradasJson && selectedDev.avariasDeclaradasJson !== "[]" ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Sim</span>
                  ) : (
                    "Nenhuma"
                  )}
                </div>
              </div>
            </div>

            {/* FORMULÁRIO DE CONFERÊNCIA DO PORTEIRO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-field">Confirmar KM Rodado</label>
                <input 
                  type="number" 
                  value={kmFinal} 
                  onChange={e => setKmFinal(parseInt(e.target.value) || 0)} 
                  className="input-admin"
                  style={{ fontSize: '1.5rem', padding: '12px' }}
                />
                <small style={{ color: 'var(--text-muted)' }}>Mínimo aceito: {selectedDev.veiculo.kmAtual} KM</small>
              </div>

              <div>
                <label className="label-field">Confirmar Nível de Combustível</label>
                <div className="fuel-grid">
                  {OPCOES_COMBUSTIVEL.map(comb => (
                    <button
                      key={comb}
                      type="button"
                      className={`btn ${combustivelFinal === comb ? 'btn-primary' : ''}`}
                      style={{ 
                        padding: '12px 4px', 
                        fontSize: '0.85rem', 
                        whiteSpace: 'nowrap',
                        backgroundColor: combustivelFinal === comb ? '' : 'var(--surface-hover)',
                        color: combustivelFinal === comb ? '' : 'var(--text-main)',
                        border: '1px solid var(--border)'
                      }}
                      onClick={() => setCombustivelFinal(comb)}
                    >
                      {comb}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-field">Registrar Avarias Encontradas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {AVARIAS_COMUNS.map(av => {
                    const selected = avariasSelecionadas.includes(av)
                    return (
                      <button
                        key={av}
                        type="button"
                        className={`btn ${selected ? 'danger-active' : ''}`}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '0.875rem',
                          backgroundColor: selected ? '' : 'var(--surface-hover)',
                          color: selected ? '' : 'var(--text-main)',
                          border: '1px solid var(--border)'
                        }}
                        onClick={() => {
                          toggleAvaria(av)
                          if (!selected) setEnviarParaManutencao(true)
                        }}
                      >
                        {selected ? "✓ " : "+ "} {av}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Outra avaria..."
                    value={customAvaria}
                    onChange={e => setCustomAvaria(e.target.value)}
                    className="input-admin"
                    style={{ flex: 1, padding: '12px' }}
                  />
                  <button type="button" className="btn btn-primary" onClick={addCustomAvaria}>
                    Adicionar
                  </button>
                </div>
              </div>

              {/* ENVIAR PARA MANUTENÇÃO */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: enviarParaManutencao ? '#fef2f2' : 'var(--surface-hover)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={enviarParaManutencao}
                  onChange={e => setEnviarParaManutencao(e.target.checked)}
                  style={{ width: '24px', height: '24px' }}
                />
                <div>
                  <strong style={{ color: enviarParaManutencao ? 'var(--danger)' : 'inherit' }}>
                    Enviar veículo para Manutenção
                  </strong>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Bloqueia o veículo de novas retiradas e agendamentos.
                  </div>
                </div>
              </label>

              <button 
                className="btn btn-primary" 
                style={{ fontSize: '1.15rem', padding: '20px', background: enviarParaManutencao ? 'var(--danger)' : 'var(--secondary)', whiteSpace: 'normal', lineHeight: '1.3', wordBreak: 'break-word' }} 
                onClick={handleConfirmar}
                disabled={loading}
              >
                {loading ? "Processando..." : enviarParaManutencao ? "CONFIRMAR E ENVIAR PARA MANUTENÇÃO" : "CONFIRMAR ENTRADA E LIBERAR"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .badge-pending {
          background: #fef3c7;
          color: #d97706;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.875rem;
        }
        .info-box {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }
        .label-field {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text);
        }
        .input-admin {
          padding: 16px;
          font-size: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          width: 100%;
          outline: none;
        }
        .danger-active {
          background-color: var(--danger);
          color: white;
          border-color: var(--danger);
        }
      `}</style>
    </div>
  )
}
