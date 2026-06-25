"use client"

import { getColaboradores, getTodosVeiculos, getVeiculosDisponiveis } from "@/app/actions"

export const clientStore = {
  colaboradores: [] as any[],
  veiculos: [] as any[],
  veiculosDisponiveis: [] as any[],
  loaded: false
}

export const preloadData = async () => {
  try {
    const [colabs, veics, disp] = await Promise.all([
      getColaboradores(),
      getTodosVeiculos(),
      getVeiculosDisponiveis()
    ])
    clientStore.colaboradores = colabs;
    clientStore.veiculos = veics;
    clientStore.veiculosDisponiveis = disp;
    clientStore.loaded = true;
  } catch (e) {
    console.error("Erro no preload:", e)
  }
}
