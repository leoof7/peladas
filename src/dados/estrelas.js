// As contas e os textos das estrelas de cada jogador. Nada aqui toca a tela,
// por isso dá pra testar sozinho com "npm test".

export const POSICOES = [
  { chave: 'goleiro', titulo: 'Goleiros', uma: 'Goleiro', curto: 'GOL' },
  { chave: 'defesa', titulo: 'Defensores', uma: 'Defesa', curto: 'DEF' },
  { chave: 'meio', titulo: 'Meio-campo', uma: 'Meio', curto: 'MEI' },
  { chave: 'ataque', titulo: 'Atacantes', uma: 'Ataque', curto: 'ATA' },
]

export const NOTA_MAXIMA = 5
export const PASSO = 0.5

// Prende a nota entre 0 e 5 e arredonda pra meia estrela mais perto.
export function arredondar(nota) {
  const valor = Number(nota)
  if (!Number.isFinite(valor)) return 0
  return Math.min(NOTA_MAXIMA, Math.max(0, Math.round(valor * 2) / 2))
}

// "3,5" — do jeito brasileiro, sem casa decimal à toa.
export function notaEmNumero(nota) {
  const valor = arredondar(nota)
  return valor % 1 === 0 ? String(valor) : valor.toFixed(1).replace('.', ',')
}

// Do jeito que o grupo já escreve no WhatsApp: estrelas inteiras e, quando tem
// meia, um ",5" colado no fim.
export function estrelasEmTexto(nota) {
  const valor = arredondar(nota)
  if (valor === 0) return 'sem nota'
  const inteiras = Math.floor(valor)
  const temMeia = valor - inteiras >= PASSO
  if (inteiras === 0) return '0,5'
  return '⭐'.repeat(inteiras) + (temMeia ? ',5' : '')
}

// Maior estrela primeiro; empatou, vai pela ordem do alfabeto.
export function ordenarPorEstrela(jogadores) {
  return [...jogadores].sort(
    (um, outro) =>
      arredondar(outro.estrelas) - arredondar(um.estrelas) ||
      (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'),
  )
}

export function ordenarPorNome(jogadores) {
  return [...jogadores].sort((um, outro) =>
    (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'),
  )
}

export function daPosicao(jogadores, chave) {
  return jogadores.filter((jogador) => jogador.posicao === chave)
}

// Média só de quem já tem nota: quem está sem nota não puxa o grupo pra baixo.
export function mediaDoGrupo(jogadores) {
  const comNota = jogadores.filter((jogador) => arredondar(jogador.estrelas) > 0)
  if (comNota.length === 0) return 0
  const soma = comNota.reduce((total, jogador) => total + arredondar(jogador.estrelas), 0)
  return Math.round((soma / comNota.length) * 10) / 10
}

// O texto pronto pra colar no grupo, na mesma cara das mensagens de lá.
export function textoPraColar(jogadores) {
  const blocos = []
  for (const posicao of POSICOES) {
    const doGrupo = ordenarPorEstrela(daPosicao(jogadores, posicao.chave))
    if (doGrupo.length === 0) continue
    const linhas = doGrupo.map((jogador) => `${jogador.nome} ${estrelasEmTexto(jogador.estrelas)}`)
    blocos.push([`*${posicao.titulo}*`, ...linhas].join('\n'))
  }
  return blocos.join('\n\n')
}
