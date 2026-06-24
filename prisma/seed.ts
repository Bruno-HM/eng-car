import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const c1 = await prisma.colaborador.create({
    data: {
      nome: 'João Silva',
      empresaId: 'EMP001',
      pinAcesso: '1234',
    },
  })

  const c2 = await prisma.colaborador.create({
    data: {
      nome: 'Maria Souza',
      empresaId: 'EMP002',
      pinAcesso: '4321',
    },
  })

  const c3 = await prisma.colaborador.create({
    data: {
      nome: 'Carlos Admin',
      empresaId: 'EMP000',
      pinAcesso: '9999',
    },
  })

  const v1 = await prisma.veiculo.create({
    data: {
      placa: 'ABC-1234',
      modelo: 'Fiat Uno',
      kmAtual: 50000,
      status: 'DISPONIVEL',
    },
  })

  const v2 = await prisma.veiculo.create({
    data: {
      placa: 'XYZ-9876',
      modelo: 'VW Gol',
      kmAtual: 35000,
      status: 'DISPONIVEL',
    },
  })

  const v3 = await prisma.veiculo.create({
    data: {
      placa: 'DEF-5678',
      modelo: 'Chevrolet Onix',
      kmAtual: 10000,
      status: 'EM_USO',
    },
  })

  console.log('Seed executado com sucesso!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
