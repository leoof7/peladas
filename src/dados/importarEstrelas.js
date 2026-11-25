import { casarNomes, lerNomesColados } from './regras.js'

export function lerEstrelasColadas(texto, jogadores) {
  const linhas = String(texto ?? '').split(/\r?\n/).flatMap((original) => {
    const limpa = original.replace(/[\uFE0F\uFE0E*~_]/g, '').trim()
    const partes = limpa.match(/^(.+?)([⭐★]+(?:[,.]5)?|\s+0[,.]5)$/u)
    if (!partes) return []
    const nota = (partes[2].match(/[⭐★]/gu)?.length ?? 0) + (/[,.]5$/.test(partes[2]) ? 0.5 : 0)
    const [nome] = lerNomesColados(partes[1])
    return nome && nota > 0 && nota <= 5 ? [{ nome, nota }] : []
  })
  const casados = casarNomes(linhas.map(({ nome }) => nome), jogadores)
  const contagem = new Map()
  for (const { jogadorId } of casados) if (jogadorId) contagem.set(jogadorId, (contagem.get(jogadorId) || 0) + 1)
  return linhas.map((linha, i) => {
    const { jogadorId, certeza } = casados[i]
    const jogador = jogadores.find((j) => j.id === jogadorId)
    const repetido = (contagem.get(jogadorId) || 0) > 1
    const anterior = jogador?.estrelas ?? 0
    return { ...linha, jogadorId, certeza, repetido, anterior, aplicar: Boolean(jogadorId && !repetido && certeza === 'exato' && !anterior) }
  })
}
