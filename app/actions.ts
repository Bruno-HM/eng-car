"use server"

import { prisma } from "@/lib/prisma"

// Busca dados para a Agenda da Home
export async function getAgenda() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  return await prisma.agendamento.findMany({
    where: {
      dataHoraInicio: {
        gte: hoje,
        lt: amanha,
      },
      status: 'ATIVO'
    },
    include: {
      colaborador: true,
      veiculo: true
    },
    orderBy: {
      dataHoraInicio: 'asc'
    }
  })
}

export async function getColaboradores() {
  return await prisma.colaborador.findMany({
    orderBy: { nome: 'asc' }
  })
}

export async function getAgendamentoAtualColaborador(colaboradorId: string) {
  const agora = new Date()
  // Considera agendamentos ativos que iniciam hoje
  const hojeInicio = new Date(agora)
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date(agora)
  hojeFim.setHours(23, 59, 59, 999)

  return await prisma.agendamento.findFirst({
    where: {
      colaboradorId,
      status: 'ATIVO',
      dataHoraInicio: {
        gte: hojeInicio,
        lte: hojeFim
      }
    },
    include: {
      veiculo: true
    }
  })
}

export async function getVeiculosDisponiveis() {
  return await prisma.veiculo.findMany({
    where: { status: 'DISPONIVEL' },
    orderBy: { modelo: 'asc' }
  })
}

export async function getVeiculosParaAgendamento() {
  return await prisma.veiculo.findMany({
    where: { status: { not: 'MANUTENCAO' } },
    orderBy: { modelo: 'asc' }
  })
}

export async function getVeiculosDisponiveisParaColaborador(colaboradorId: string) {
  const agora = new Date()
  const hojeInicio = new Date(agora)
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date(agora)
  hojeFim.setHours(23, 59, 59, 999)

  const agendamentosHoje = await prisma.agendamento.findMany({
    where: {
      status: 'ATIVO',
      dataHoraInicio: {
        gte: hojeInicio,
        lte: hojeFim
      }
    }
  })

  const veiculosReservadosPorOutros = agendamentosHoje
    .filter(a => a.colaboradorId !== colaboradorId)
    .map(a => a.veiculoId)

  return await prisma.veiculo.findMany({
    where: {
      status: 'DISPONIVEL',
      id: {
        notIn: veiculosReservadosPorOutros
      }
    },
    orderBy: { modelo: 'asc' }
  })
}

export async function getVeiculosEmUsoPorColaborador(colaboradorId: string) {
  const veiculos = await prisma.veiculo.findMany({
    where: { status: 'EM_USO' },
    include: {
      logs: {
        orderBy: { dataHoraAcao: 'desc' },
        take: 1
      }
    }
  })

  return veiculos.filter(v => 
    v.logs.length > 0 && 
    v.logs[0].tipo === 'RETIRADA' && 
    v.logs[0].colaboradorId === colaboradorId
  )
}

export async function getTodosVeiculos() {
  return await prisma.veiculo.findMany({
    include: {
      logs: {
        orderBy: { dataHoraAcao: 'desc' },
        take: 1,
        include: { colaborador: true }
      }
    },
    orderBy: { modelo: 'asc' }
  })
}

export async function validarPin(colaboradorId: string, pin: string) {
  const colab = await prisma.colaborador.findUnique({
    where: { id: colaboradorId }
  })
  if (!colab) return { success: false, error: "Colaborador não encontrado" }
  if (colab.pinAcesso !== pin) return { success: false, error: "PIN Incorreto" }
  return { success: true, colaborador: colab }
}

// Lógica de No-Show
async function processarNoShows() {
  const agora = new Date()
  const limiteAtraso = new Date(agora.getTime() - 45 * 60000) // 45 minutos atrás

  await prisma.agendamento.updateMany({
    where: {
      status: 'ATIVO',
      dataHoraInicio: { lt: limiteAtraso }
    },
    data: {
      status: 'CANCELADO_NOSHOW'
    }
  })
}

export async function retirarVeiculo(colaboradorId: string, veiculoId: string) {
  await processarNoShows()

  const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } })
  if (!veiculo || veiculo.status !== 'DISPONIVEL') {
    return { success: false, error: "Veículo não está disponível." }
  }

  // Verifica se o veículo está reservado para outra pessoa hoje
  const agora = new Date()
  const hojeInicio = new Date(agora)
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date(agora)
  hojeFim.setHours(23, 59, 59, 999)

  const agendamentoConflitante = await prisma.agendamento.findFirst({
    where: {
      veiculoId: veiculoId,
      status: 'ATIVO',
      colaboradorId: { not: colaboradorId },
      dataHoraInicio: {
        gte: hojeInicio,
        lte: hojeFim
      }
    }
  })

  if (agendamentoConflitante) {
    return { success: false, error: "Este veículo está reservado para outro colaborador hoje." }
  }

  // Nós NÃO concluímos o agendamento aqui. Ele continua ATIVO para que o calendário continue bloqueado
  // até o momento em que ele efetivamente devolver o carro.

  // Atualiza veículo
  await prisma.veiculo.update({
    where: { id: veiculoId },
    data: { status: 'EM_USO' }
  })

  // Registra LOG
  await prisma.log.create({
    data: {
      veiculoId,
      colaboradorId,
      tipo: 'RETIRADA',
      kmInformado: veiculo.kmAtual,
      dataHoraAcao: new Date()
    }
  })

  return { success: true }
}

export async function devolverVeiculo(
  colaboradorId: string, 
  veiculoId: string, 
  kmInformado: number, 
  combustivel: string, 
  avariasJson: string
) {
  const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } })
  if (!veiculo || veiculo.status !== 'EM_USO') {
    return { success: false, error: "Veículo não está em uso." }
  }

  const lastLog = await prisma.log.findFirst({
    where: { veiculoId },
    orderBy: { dataHoraAcao: 'desc' }
  })

  if (lastLog?.tipo !== 'RETIRADA' || lastLog?.colaboradorId !== colaboradorId) {
    return { success: false, error: "Este veículo foi retirado por outro colaborador." }
  }

  if (kmInformado < veiculo.kmAtual) {
    return { success: false, error: `KM inválido. O KM atual é ${veiculo.kmAtual}` }
  }

  // Cria a solicitação de devolução pendente
  await prisma.devolucaoPendente.upsert({
    where: { veiculoId },
    update: {
      colaboradorId,
      kmDeclarado: kmInformado,
      combustivelDeclarado: combustivel,
      avariasDeclaradasJson: avariasJson,
      dataHoraSolicitacao: new Date()
    },
    create: {
      veiculoId,
      colaboradorId,
      kmDeclarado: kmInformado,
      combustivelDeclarado: combustivel,
      avariasDeclaradasJson: avariasJson
    }
  })

  // Atualiza veículo para AGUARDANDO_CONFERENCIA
  await prisma.veiculo.update({
    where: { id: veiculoId },
    data: { 
      status: 'AGUARDANDO_CONFERENCIA'
    }
  })

  // Conclui o agendamento ativo e libera os horários restantes
  await prisma.agendamento.updateMany({
    where: {
      veiculoId: veiculoId,
      colaboradorId: colaboradorId,
      status: 'ATIVO'
    },
    data: {
      status: 'CONCLUIDO',
      dataHoraFim: new Date()
    }
  })

  return { success: true }
}

export async function getDevolucoesPendentes() {
  return await prisma.devolucaoPendente.findMany({
    include: {
      veiculo: true,
      colaborador: true
    },
    orderBy: {
      dataHoraSolicitacao: 'desc'
    }
  })
}

export async function confirmarDevolucaoPorteiro(
  devolucaoPendenteId: string,
  kmFinal: number,
  combustivelFinal: string,
  avariasFinalJson: string,
  enviarParaManutencao: boolean
) {
  const dev = await prisma.devolucaoPendente.findUnique({
    where: { id: devolucaoPendenteId },
    include: { veiculo: true, colaborador: true }
  })

  if (!dev) {
    return { success: false, error: "Solicitação de devolução não encontrada." }
  }

  if (kmFinal < dev.veiculo.kmAtual) {
    return { success: false, error: `KM inválido. O KM atual é ${dev.veiculo.kmAtual}` }
  }

  // Define novo status do veículo
  const novoStatus = enviarParaManutencao ? 'MANUTENCAO' : 'DISPONIVEL'

  // Atualiza veículo
  await prisma.veiculo.update({
    where: { id: dev.veiculoId },
    data: {
      status: novoStatus,
      kmAtual: kmFinal
    }
  })

  // Salva o Log final de DEVOLUCAO com auditoria
  await prisma.log.create({
    data: {
      veiculoId: dev.veiculoId,
      colaboradorId: dev.colaboradorId,
      tipo: 'DEVOLUCAO',
      kmInformado: kmFinal,
      combustivel: combustivelFinal,
      avariasJson: avariasFinalJson,
      kmOriginalColab: dev.kmDeclarado,
      combustivelOriginalColab: dev.combustivelDeclarado,
      avariasOriginalColabJson: dev.avariasDeclaradasJson,
      dataHoraAcao: new Date()
    }
  })

  // Apaga a solicitação pendente
  await prisma.devolucaoPendente.delete({
    where: { id: devolucaoPendenteId }
  })

  return { success: true }
}

export async function agendarVeiculo(veiculoId: string, colaboradorId: string, inicio: Date, fim: Date) {
  // Verifica conflito
  const conflito = await prisma.agendamento.findFirst({
    where: {
      veiculoId,
      status: 'ATIVO',
      OR: [
        { dataHoraInicio: { lte: fim }, dataHoraFim: { gte: inicio } }
      ]
    }
  })

  if (conflito) {
    return { success: false, error: "Veículo já possui agendamento neste período." }
  }

  await prisma.agendamento.create({
    data: {
      veiculoId,
      colaboradorId,
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      status: 'ATIVO'
    }
  })

  return { success: true }
}

export async function criarColaborador(nome: string, empresaId: string, pinAcesso: string) {
  await prisma.colaborador.create({
    data: { nome, empresaId, pinAcesso }
  })
  return { success: true }
}

export async function criarVeiculo(placa: string, modelo: string, kmAtual: number) {
  await prisma.veiculo.create({
    data: { placa, modelo, kmAtual, status: 'DISPONIVEL' }
  })
  return { success: true }
}

export async function editarColaborador(id: string, nome: string, empresaId: string, pinAcesso: string) {
  await prisma.colaborador.update({
    where: { id },
    data: { nome, empresaId, pinAcesso }
  })
  return { success: true }
}

export async function excluirColaborador(id: string) {
  await prisma.colaborador.delete({ where: { id } })
  return { success: true }
}

export async function editarVeiculo(id: string, placa: string, modelo: string, kmAtual: number, status: string) {
  await prisma.veiculo.update({
    where: { id },
    data: { placa, modelo, kmAtual, status }
  })
  return { success: true }
}

export async function excluirVeiculo(id: string) {
  await prisma.veiculo.delete({ where: { id } })
  return { success: true }
}

export async function getAgendamentosAtivos() {
  return await prisma.agendamento.findMany({
    where: { status: 'ATIVO' },
    include: {
      colaborador: true,
      veiculo: true
    },
    orderBy: {
      dataHoraInicio: 'asc'
    }
  })
}

export async function getAgendamentosPorVeiculo(veiculoId: string) {
  const agora = new Date()
  return await prisma.agendamento.findMany({
    where: {
      veiculoId,
      status: 'ATIVO',
      dataHoraFim: {
        gte: agora
      }
    },
    orderBy: {
      dataHoraInicio: 'asc'
    }
  })
}

export async function cancelarAgendamento(agendamentoId: string, pin: string | null = null) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { colaborador: true }
  })

  if (!agendamento) {
    return { success: false, error: "Agendamento não encontrado." }
  }

  if (pin !== null) {
    if (agendamento.colaborador.pinAcesso !== pin) {
      return { success: false, error: "PIN Incorreto." }
    }
  }

  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: { status: 'CANCELADO' }
  })

  return { success: true }
}

export async function getLogs() {
  return await prisma.log.findMany({
    include: {
      colaborador: true,
      veiculo: true
    },
    orderBy: {
      dataHoraAcao: 'desc'
    }
  })
}

export async function forcarDevolucaoVeiculo(veiculoId: string) {
  const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } })
  if (!veiculo || (veiculo.status !== 'EM_USO' && veiculo.status !== 'AGUARDANDO_CONFERENCIA')) {
    return { success: false, error: "Veículo não está em uso ou aguardando conferência." }
  }

  // Acha o último colaborador que retirou
  const lastLog = await prisma.log.findFirst({
    where: { veiculoId, tipo: 'RETIRADA' },
    orderBy: { dataHoraAcao: 'desc' }
  })

  let colaboradorId = lastLog ? lastLog.colaboradorId : null

  if (!colaboradorId) {
    const adminColab = await prisma.colaborador.findFirst({
      where: { empresaId: 'EMP000' }
    })
    if (adminColab) {
      colaboradorId = adminColab.id
    } else {
      const fallbackColab = await prisma.colaborador.findFirst()
      colaboradorId = fallbackColab ? fallbackColab.id : null
    }
  }

  if (!colaboradorId) {
    return { success: false, error: "Nenhum colaborador encontrado para associar ao log." }
  }

  // Libera o veículo
  await prisma.veiculo.update({
    where: { id: veiculoId },
    data: { 
      status: 'DISPONIVEL'
    }
  })

  // Limpa solicitações pendentes se houver
  await prisma.devolucaoPendente.deleteMany({
    where: { veiculoId }
  })

  // Registra log de devolução forçada
  await prisma.log.create({
    data: {
      veiculoId,
      colaboradorId,
      tipo: 'DEVOLUCAO',
      kmInformado: veiculo.kmAtual,
      combustivel: 'Desconhecido',
      avariasJson: JSON.stringify(['Devolução Forçada pelo Administrador']),
      dataHoraAcao: new Date()
    }
  })

  return { success: true }
}
