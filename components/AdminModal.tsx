"use client"

import { useState, useEffect } from "react"
import { 
  criarColaborador, criarVeiculo, 
  editarColaborador, editarVeiculo, 
  excluirColaborador, excluirVeiculo,
  getColaboradores, getTodosVeiculos,
  getLogs, forcarDevolucaoVeiculo,
  getAgendamentosAtivos, cancelarAgendamento,
  getDevolucoesPendentes, confirmarDevolucaoPorteiro
} from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"

export default function AdminModal({ onClose, onOpenPorteiro }: { onClose: () => void, onOpenPorteiro: () => void }) {
  const { showAlert, showConfirm } = useDialog()
  const [step, setStep] = useState(1) // 1: PIN, 2: Menu, 3: List Colab, 4: Form Colab, 5: List Veiculos, 6: Form Veiculo, 7: List Logs, 8: List Agendamentos, 9: Conferir Devolucoes
  const [pinError, setPinError] = useState<string | null>(null)

  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [devsPendentes, setDevsPendentes] = useState<any[]>([])
  const [selectedDev, setSelectedDev] = useState<any>(null)

  // Estados para conferência
  const [kmFinal, setKmFinal] = useState<number>(0)
  const [combustivelFinal, setCombustivelFinal] = useState<string>("Cheio")
  const [avariasSelecionadas, setAvariasSelecionadas] = useState<string[]>([])
  const [customAvaria, setCustomAvaria] = useState<string>("")
  const [enviarParaManutencao, setEnviarParaManutencao] = useState<boolean>(false)

  // Formulários
  const [colabId, setColabId] = useState("")
  const [nome, setNome] = useState("")
  const [empresaId, setEmpresaId] = useState("")
  const [pinAcesso, setPinAcesso] = useState("")

  const [veiculoId, setVeiculoId] = useState("")
  const [placa, setPlaca] = useState("")
  const [modelo, setModelo] = useState("")
  const [kmAtual, setKmAtual] = useState("")
  const [statusVeiculo, setStatusVeiculo] = useState("DISPONIVEL")

  const MASTER_PIN = "9999"

  const reloadVeiculos = async () => {
    const todos = await getTodosVeiculos()
    setVeiculos(todos) 
  }

  const reloadColabs = async () => {
    const cols = await getColaboradores()
    setColaboradores(cols)
  }

  const reloadLogs = async () => {
    const data = await getLogs()
    setLogs(data)
  }

  const reloadAgendamentos = async () => {
    const data = await getAgendamentosAtivos()
    setAgendamentos(data)
  }

  const reloadDevPendentes = async () => {
    const data = await getDevolucoesPendentes()
    setDevsPendentes(data)
  }

  const handleSelectDev = (dev: any) => {
    setSelectedDev(dev)
    setKmFinal(dev.kmDeclarado)
    setCombustivelFinal(dev.combustivelDeclarado)
    
    let avariasArray: string[] = []
    if (dev.avariasDeclaradasJson) {
      try {
        const parsed = JSON.parse(dev.avariasDeclaradasJson)
        if (Array.isArray(parsed)) avariasArray = parsed
      } catch {
        avariasArray = []
      }
    }
    setAvariasSelecionadas(avariasArray)
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
      setEnviarParaManutencao(true)
    }
  }

  const handleConfirmarDevolucao = async () => {
    if (!selectedDev) return
    if (kmFinal < selectedDev.veiculo.kmAtual) {
      await showAlert(`O KM final não pode ser menor que o KM atual do veículo: ${selectedDev.veiculo.kmAtual}`)
      return
    }

    const res = await confirmarDevolucaoPorteiro(
      selectedDev.id,
      kmFinal,
      combustivelFinal,
      JSON.stringify(avariasSelecionadas),
      enviarParaManutencao
    )

    if (res.success) {
      await showAlert("Devolução confirmada com sucesso!")
      setSelectedDev(null)
      await reloadDevPendentes()
    } else {
      await showAlert("Erro: " + res.error)
    }
  }

  const handlePinComplete = (pin: string) => {
    if (pin === MASTER_PIN) {
      setPinError(null)
      setStep(2)
    } else if (pin === "8888") {
      setPinError(null)
      onOpenPorteiro()
    } else {
      setPinError("Acesso Negado")
    }
  }

  // Colaboradores
  const abrirNovoColab = () => {
    setColabId("")
    setNome("")
    setEmpresaId("")
    setPinAcesso("")
    setStep(4)
  }

  const abrirEditarColab = (c: any) => {
    setColabId(c.id)
    setNome(c.nome)
    setEmpresaId(c.empresaId)
    setPinAcesso(c.pinAcesso)
    setStep(4)
  }

  const salvarColab = async () => {
    if (!nome || !empresaId || !pinAcesso || pinAcesso.length !== 4) {
      await showAlert("Preencha todos os campos. PIN = 4 dígitos.")
      return
    }
    if (colabId) {
      await editarColaborador(colabId, nome, empresaId, pinAcesso)
    } else {
      await criarColaborador(nome, empresaId, pinAcesso)
    }
    await showAlert("Salvo com sucesso!")
    await reloadColabs()
    setStep(3)
  }

  const deletarColab = async (id: string) => {
    if (await showConfirm("Tem certeza que deseja excluir?")) {
      await excluirColaborador(id)
      await reloadColabs()
    }
  }

  // Veículos
  const abrirNovoVeiculo = () => {
    setVeiculoId("")
    setPlaca("")
    setModelo("")
    setKmAtual("")
    setStatusVeiculo("DISPONIVEL")
    setStep(6)
  }

  const abrirEditarVeiculo = (v: any) => {
    setVeiculoId(v.id)
    setPlaca(v.placa)
    setModelo(v.modelo)
    setKmAtual(v.kmAtual.toString())
    setStatusVeiculo(v.status)
    setStep(6)
  }

  const salvarVeiculo = async () => {
    if (!placa || !modelo || !kmAtual) {
      await showAlert("Preencha todos os campos.")
      return
    }
    if (veiculoId) {
      await editarVeiculo(veiculoId, placa, modelo, parseInt(kmAtual), statusVeiculo)
    } else {
      await criarVeiculo(placa, modelo, parseInt(kmAtual))
    }
    await showAlert("Salvo com sucesso!")
    await reloadVeiculos()
    setStep(5)
  }

  const deletarVeiculo = async (id: string) => {
    if (await showConfirm("Tem certeza que deseja excluir?")) {
      await excluirVeiculo(id)
      await reloadVeiculos()
    }
  }

  const handleForcarDevolucao = async (id: string) => {
    if (await showConfirm("Deseja realmente forçar a devolução deste veículo? Isso registrará um log de devolução forçada.")) {
      const res = await forcarDevolucaoVeiculo(id)
      if (res.success) {
        await showAlert("Veículo devolvido com sucesso!")
        await reloadVeiculos()
      } else {
        await showAlert("Erro: " + res.error)
      }
    }
  }

  return (
    <div className="modal-overlay">
      {step === 1 && (
        <VirtualNumpad 
          title="Modo Administrador"
          onComplete={handlePinComplete}
          onCancel={onClose}
          error={pinError}
        />
      )}

      {step === 2 && (
        <div className="modal-content" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Painel de Administração</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <button className="list-item" onClick={() => { reloadColabs(); setStep(3); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>👥</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="list-item-title">Gerenciar Colaboradores</div>
                  <div className="list-item-subtitle">Adicionar, editar ou excluir motoristas.</div>
                </div>
              </div>
            </button>
            <button className="list-item" onClick={() => { reloadVeiculos(); setStep(5); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>🚗</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="list-item-title">Gerenciar Veículos</div>
                  <div className="list-item-subtitle">Ajustar frota, status de manutenção e devolução forçada.</div>
                </div>
              </div>
            </button>
            <button className="list-item" onClick={() => { reloadLogs(); setStep(7); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>📋</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="list-item-title">Histórico de Registros (Logs)</div>
                  <div className="list-item-subtitle">Histórico completo de retiradas, devoluções e avarias.</div>
                </div>
              </div>
            </button>
            <button className="list-item" onClick={() => { reloadAgendamentos(); setStep(8); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>📅</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="list-item-title">Gerenciar Agendamentos</div>
                  <div className="list-item-subtitle">Ver e cancelar reservas ativas da frota.</div>
                </div>
              </div>
            </button>
            <button className="list-item" onClick={() => { reloadDevPendentes(); setStep(9); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2rem' }}>🔎</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="list-item-title">Conferir Devoluções</div>
                  <div className="list-item-subtitle">Aprovar e auditar devoluções pendentes de vistoria.</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* LISTA COLABORADORES */}
      {step === 3 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Colaboradores</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-close" onClick={() => setStep(2)}>Voltar</button>
              <button className="btn btn-primary" onClick={abrirNovoColab}>+ Novo</button>
            </div>
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {colaboradores.map(c => (
              <div key={c.id} className="admin-list-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{c.nome}</strong> (ID: {c.empresaId}) - PIN: {c.pinAcesso}
                </div>
                <div className="admin-list-actions">
                  <button className="btn" style={{ marginRight: '8px', padding: '8px 16px', background: 'var(--surface-hover)' }} onClick={() => abrirEditarColab(c)}>Editar</button>
                  <button className="btn" style={{ padding: '8px 16px', color: 'var(--danger)', background: '#fef2f2' }} onClick={() => deletarColab(c.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM COLABORADORES */}
      {step === 4 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{colabId ? "Editar Colaborador" : "Novo Colaborador"}</h2>
            <button className="btn-close" onClick={() => setStep(3)}>Voltar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} className="input-admin" />
            <input placeholder="ID Empresa / Matrícula" value={empresaId} onChange={e => setEmpresaId(e.target.value)} className="input-admin" />
            <input placeholder="PIN (4 dígitos)" value={pinAcesso} onChange={e => setPinAcesso(e.target.value)} maxLength={4} className="input-admin" />
            <button className="btn btn-primary" onClick={salvarColab}>SALVAR</button>
          </div>
        </div>
      )}

      {/* LISTA VEICULOS */}
      {step === 5 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Veículos</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-close" onClick={() => setStep(2)}>Voltar</button>
              <button className="btn btn-primary" onClick={abrirNovoVeiculo}>+ Novo</button>
            </div>
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {veiculos.map(v => {
              const inUseBy = (v.status === 'EM_USO' || v.status === 'AGUARDANDO_CONFERENCIA') && v.logs && v.logs.length > 0 && v.logs[0].colaborador ? v.logs[0].colaborador.nome : null;
              return (
              <div key={v.id} className="admin-list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{v.placa}</strong> - {v.modelo} - KM: {v.kmAtual} - <span style={{ 
                    fontWeight: 600, 
                    color: v.status === 'DISPONIVEL' ? 'var(--secondary)' : v.status === 'EM_USO' ? 'var(--primary)' : 'var(--danger)'
                  }}>{v.status}</span>
                  {inUseBy && <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.9em' }}>(Com: {inUseBy})</span>}
                </div>
                <div className="admin-list-actions">
                  {(v.status === 'EM_USO' || v.status === 'AGUARDANDO_CONFERENCIA') && (
                    <button className="btn" style={{ padding: '8px 16px', color: 'white', background: 'var(--secondary)' }} onClick={() => handleForcarDevolucao(v.id)}>
                      Forçar Devolução
                    </button>
                  )}
                  <button className="btn" style={{ padding: '8px 16px', background: 'var(--surface-hover)' }} onClick={() => abrirEditarVeiculo(v)}>Editar</button>
                  <button className="btn" style={{ padding: '8px 16px', color: 'var(--danger)', background: '#fef2f2' }} onClick={() => deletarVeiculo(v.id)}>Excluir</button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* FORM VEICULOS */}
      {step === 6 && (
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{veiculoId ? "Editar Veículo" : "Novo Veículo"}</h2>
            <button className="btn-close" onClick={() => setStep(5)}>Voltar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input placeholder="Modelo (ex: VW Gol)" value={modelo} onChange={e => setModelo(e.target.value)} className="input-admin" />
            <input placeholder="Placa (ex: ABC-1234)" value={placa} onChange={e => setPlaca(e.target.value)} className="input-admin" />
            <input placeholder="KM Atual" type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} className="input-admin" />
            
            {veiculoId && (
              <select value={statusVeiculo} onChange={e => setStatusVeiculo(e.target.value)} className="input-admin">
                <option value="DISPONIVEL">Disponível</option>
                <option value="EM_USO">Em Uso</option>
                <option value="MANUTENCAO">Manutenção</option>
              </select>
            )}

            <button className="btn btn-primary" onClick={salvarVeiculo}>SALVAR</button>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE LOGS */}
      {step === 7 && (
        <div className="modal-content" style={{ maxWidth: '850px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Histórico de Registros (Logs)</h2>
            <button className="btn-close" onClick={() => setStep(2)}>Voltar</button>
          </div>
          
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum log registrado ainda.
              </div>
            ) : (
              <table className="table-logs" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
                    <th style={{ padding: '12px' }}>Data/Hora</th>
                    <th style={{ padding: '12px' }}>Ação</th>
                    <th style={{ padding: '12px' }}>Veículo</th>
                    <th style={{ padding: '12px' }}>Colaborador</th>
                    <th style={{ padding: '12px' }}>KM</th>
                    <th style={{ padding: '12px' }}>Combustível</th>
                    <th style={{ padding: '12px' }}>Avarias</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => {
                    const dataFormat = new Date(l.dataHoraAcao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    let dataOriginalFormat = null
                    if (l.dataHoraOriginalColab) {
                      dataOriginalFormat = new Date(l.dataHoraOriginalColab).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    }
                    let avariasFormat = "-"
                    if (l.avariasJson && l.avariasJson !== "{}" && l.avariasJson !== "null") {
                      try {
                        const avArr = JSON.parse(l.avariasJson)
                        if (Array.isArray(avArr)) avariasFormat = avArr.join(', ')
                      } catch {
                        avariasFormat = l.avariasJson
                      }
                    }
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td data-label="Data/Hora" style={{ padding: '12px', fontSize: '0.875rem' }}>
                          {l.tipo === 'DEVOLUCAO' && dataOriginalFormat ? (
                            <>
                              <div><strong>Devolvido:</strong> {dataOriginalFormat}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                                Confirmado: {dataFormat}
                              </div>
                            </>
                          ) : (
                            dataFormat
                          )}
                        </td>
                        <td data-label="Ação" style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600,
                            backgroundColor: l.tipo === 'RETIRADA' ? '#eff6ff' : '#ecfdf5',
                            color: l.tipo === 'RETIRADA' ? 'var(--primary)' : 'var(--secondary)'
                          }}>{l.tipo}</span>
                        </td>
                        <td data-label="Veículo" style={{ padding: '12px', fontSize: '0.875rem' }}>{l.veiculo.placa} - {l.veiculo.modelo}</td>
                        <td data-label="Colaborador" style={{ padding: '12px', fontSize: '0.875rem' }}>{l.colaborador ? l.colaborador.nome : 'ADMIN'}</td>
                        <td data-label="KM" style={{ padding: '12px', fontSize: '0.875rem' }}>
                          {l.kmInformado} 
                          {l.kmOriginalColab && l.kmOriginalColab !== l.kmInformado && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                              (Declarado: {l.kmOriginalColab})
                            </div>
                          )}
                        </td>
                        <td data-label="Combustível" style={{ padding: '12px', fontSize: '0.875rem' }}>
                          {l.combustivel || '-'}
                          {l.combustivelOriginalColab && l.combustivelOriginalColab !== l.combustivel && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                              (Declarado: {l.combustivelOriginalColab})
                            </div>
                          )}
                        </td>
                        <td data-label="Avarias" style={{ padding: '12px', fontSize: '0.875rem', color: avariasFormat !== '-' ? 'var(--danger)' : 'inherit' }}>
                          {avariasFormat}
                          {l.avariasOriginalColabJson && l.avariasOriginalColabJson !== l.avariasJson && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                              (Diferente da declaração)
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* GERENCIAR AGENDAMENTOS */}
      {step === 8 && (
        <div className="modal-content" style={{ maxWidth: '750px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Agendamentos Ativos</h2>
            <button className="btn-close" onClick={() => setStep(2)}>Voltar</button>
          </div>
          
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {agendamentos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum agendamento ativo no momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {agendamentos.map(a => {
                  const dataFormat = new Date(a.dataHoraInicio).toLocaleDateString('pt-BR')
                  const start = new Date(a.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  const end = new Date(a.dataHoraFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div>
                        <strong>{a.colaborador.nome}</strong> - {a.veiculo.placa} ({a.veiculo.modelo})
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Data: {dataFormat} | Horário: {start} às {end}
                        </div>
                      </div>
                      <button 
                        className="btn" 
                        style={{ padding: '8px 16px', color: 'var(--danger)', background: '#fef2f2' }}
                        onClick={async () => {
                          if (await showConfirm("Deseja realmente cancelar este agendamento?")) {
                            const res = await cancelarAgendamento(a.id, null)
                            if (res.success) {
                              await showAlert("Agendamento cancelado com sucesso!")
                              await reloadAgendamentos()
                            } else {
                              await showAlert("Erro: " + res.error)
                            }
                          }
                        }}
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFERIR DEVOLUÇÕES (ADMIN/MASTER) */}
      {step === 9 && (
        <div className="modal-content" style={{ maxWidth: selectedDev ? '750px' : '650px' }}>
          <div className="modal-header">
            <h2 className="modal-title">
              {selectedDev ? `Conferir Entrada: ${selectedDev.veiculo.placa} - ${selectedDev.veiculo.modelo}` : "Devoluções Pendentes"}
            </h2>
            <button 
              className="btn-close" 
              onClick={selectedDev ? () => setSelectedDev(null) : () => setStep(2)}
            >
              {selectedDev ? "Voltar" : "Voltar ao Menu"}
            </button>
          </div>

          {devsPendentes.length === 0 && !selectedDev ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum veículo aguardando conferência.
            </div>
          ) : !selectedDev ? (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {devsPendentes.map(d => {
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
                        <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '0.875rem' }}>
                          Conferir 🔎
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Confirmar KM Rodado</label>
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
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Confirmar Nível de Combustível</label>
                  <div className="fuel-grid">
                    {["Cheio", "3/4", "Meio", "1/4", "Reserva"].map(comb => (
                      <button
                        key={comb}
                        type="button"
                        className={`btn ${combustivelFinal === comb ? 'btn-primary' : ''}`}
                        style={{ 
                          padding: '12px 4px', 
                          fontSize: '0.85rem', 
                          whiteSpace: 'nowrap',
                          backgroundColor: combustivelFinal === comb ? '' : 'var(--surface-hover)',
                          color: combustivelFinal === comb ? '' : 'var(--text-main)'
                        }}
                        onClick={() => setCombustivelFinal(comb)}
                      >
                        {comb}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Registrar Avarias Encontradas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {["Risco Lateral", "Parachoque Amassado", "Lente de Farol Quebrada", "Pneu Murcho/Furado", "Sujeira Interna Extrema"].map(av => {
                      const selected = avariasSelecionadas.includes(av)
                      return (
                        <button
                          key={av}
                          type="button"
                          className={`btn ${selected ? 'btn-danger' : ''}`}
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '0.875rem', 
                            backgroundColor: selected ? 'var(--danger)' : 'var(--surface-hover)', 
                            color: selected ? '#fff' : 'var(--text-main)',
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

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: enviarParaManutencao ? '#fef2f2' : 'var(--surface-hover)', borderRadius: '12px', cursor: 'pointer' }}>
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
                      Bloqueia o veículo de novas retiradas.
                    </div>
                  </div>
                </label>

                <button 
                  className="btn btn-primary" 
                  style={{ fontSize: '1.15rem', padding: '20px', background: enviarParaManutencao ? 'var(--danger)' : 'var(--secondary)', whiteSpace: 'normal', lineHeight: '1.3', wordBreak: 'break-word' }} 
                  onClick={handleConfirmarDevolucao}
                >
                  {enviarParaManutencao ? "CONFIRMAR E ENVIAR PARA MANUTENÇÃO" : "CONFIRMAR ENTRADA E LIBERAR"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .input-admin {
          padding: 16px;
          font-size: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          width: 100%;
        }
      `}</style>
    </div>
  )
}
