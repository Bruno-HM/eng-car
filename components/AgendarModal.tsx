"use client"

import { useState, useEffect } from "react"
import { getColaboradores, getVeiculosDisponiveis, validarPin, agendarVeiculo, getAgendamentosPorVeiculo } from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"
import { clientStore } from "@/lib/clientStore"
import DatePicker, { registerLocale } from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { ptBR } from "date-fns/locale"

registerLocale('pt-BR', ptBR)

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

  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [agendamentosVeiculo, setAgendamentosVeiculo] = useState<any[]>([])
  const [loadingReservas, setLoadingReservas] = useState(false)

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
    const agendarRes = await agendarVeiculo(selectedVeiculo.id, selectedColab.id, startDate!, endDate!)
    setLoading(false)

    if (agendarRes.success) {
      await showAlert("Veículo agendado com sucesso!")
      onClose()
    } else {
      await showAlert("Erro: " + agendarRes.error)
      setStep(2) // Volta pra tela de data
    }
  }

  const isTimeBooked = (time: Date) => {
    return agendamentosVeiculo.some(r => {
      const start = new Date(r.dataHoraInicio)
      const end = new Date(r.dataHoraFim)
      return time >= start && time < end
    })
  }

  const filterPassedTimeStart = (time: Date) => {
    const currentDate = new Date()
    const selectedDate = new Date(time)
    return currentDate.getTime() < selectedDate.getTime() && !isTimeBooked(time)
  }

  const filterPassedTimeEnd = (time: Date) => {
    const minDate = startDate || new Date()
    const selectedDate = new Date(time)
    return minDate.getTime() < selectedDate.getTime() && !isTimeBooked(time)
  }

  const validarDatas = async () => {
    if (!startDate || !endDate) {
      await showAlert("Preencha todas as datas e horários.")
      return
    }
    const agora = new Date()

    if (startDate < agora) {
      await showAlert("O horário de início não pode ser no passado.")
      return
    }

    if (endDate <= startDate) {
      await showAlert("O horário de devolução deve ser posterior ao horário de retirada.")
      return
    }

    const hasOverlap = agendamentosVeiculo.some(r => {
      const start = new Date(r.dataHoraInicio)
      const end = new Date(r.dataHoraFim)
      return (startDate < end && endDate > start)
    })

    if (hasOverlap) {
      await showAlert("O período selecionado entra em conflito com uma reserva já existente para este veículo.")
      return
    }

    setStep(3)
  }

  const handleSelectVeiculo = async (v: any) => {
    setSelectedVeiculo(v)
    setStep(2)
    setLoadingReservas(true)
    const reservas = await getAgendamentosPorVeiculo(v.id)
    setAgendamentosVeiculo(reservas)
    setLoadingReservas(false)
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
                  onClick={() => handleSelectVeiculo(v)}
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
          
          {loadingReservas ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Buscando disponibilidade do veículo...
            </div>
          ) : (
            <div className="responsive-grid-2" style={{ gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Retirada</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  timeCaption="Hora"
                  dateFormat="dd/MM/yyyy HH:mm"
                  locale="pt-BR"
                  filterTime={filterPassedTimeStart}
                  minDate={new Date()}
                  placeholderText="Selecionar Data e Hora"
                  className="custom-datepicker"
                  withPortal
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Devolução</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  timeCaption="Hora"
                  dateFormat="dd/MM/yyyy HH:mm"
                  locale="pt-BR"
                  filterTime={filterPassedTimeEnd}
                  minDate={startDate || new Date()}
                  placeholderText="Selecionar Data e Hora"
                  className="custom-datepicker"
                  withPortal
                />
              </div>
            </div>
          )}

          {!loadingReservas && agendamentosVeiculo.length > 0 && (
            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--danger)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span> Horários já reservados:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {agendamentosVeiculo.map(r => (
                  <li key={r.id}>
                    {new Date(r.dataHoraInicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} até {new Date(r.dataHoraFim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ padding: '24px', fontSize: '1.5rem', marginTop: '16px', width: '100%', opacity: loadingReservas ? 0.5 : 1 }}
            onClick={validarDatas}
            disabled={loadingReservas}
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
