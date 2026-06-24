"use client"

import { useState } from "react"
import { cancelarAgendamento } from "@/app/actions"
import VirtualNumpad from "./VirtualNumpad"
import { useDialog } from "@/components/DialogContext"

export default function CancelarAgendamentoModal({ 
  agendamento, 
  onClose 
}: { 
  agendamento: any, 
  onClose: () => void 
}) {
  const { showAlert } = useDialog()
  const [pinError, setPinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePinComplete = async (pin: string) => {
    setLoading(true)
    const res = await cancelarAgendamento(agendamento.id, pin)
    setLoading(false)
    if (res.success) {
      await showAlert("Agendamento cancelado com sucesso!")
      onClose()
    } else {
      setPinError(res.error || "Erro ao cancelar")
    }
  }

  return (
    <div className="modal-overlay">
      <VirtualNumpad 
        title={`PIN de ${agendamento.colaborador.nome} para Cancelar`}
        onComplete={handlePinComplete}
        onCancel={onClose}
        error={pinError}
      />
    </div>
  )
}
