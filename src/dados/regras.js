// As contas da pelada. Tudo aqui é conta pura: entra dado, sai resultado.
// Nada de banco, nada de tela — é a parte que tem teste automático.

export function centavos(valor) {
  return Math.round(Number(valor || 0) * 100)
}

export function emReais(valorEmCentavos) {
  return valorEmCentavos / 100
}

// Divide um valor entre pessoas, arredondando no centavo.
// A diferença que sobra ou falta é devolvida pra ser mostrada na tela.
export function dividir(total, pessoas) {
  if (!pessoas || pessoas < 1) return { porPessoa: 0, diferenca: 0 }
  const totalEmCentavos = centavos(total)
  const porPessoa = Math.round(totalEmCentavos / pessoas)
  return {
    porPessoa: emReais(porPessoa),
    diferenca: emReais(porPessoa * pessoas - totalEmCentavos),
  }
}

// Quem ganhou o jogo da Madrugada. Empate deixa os dois times devendo.
export function resultadoDoJogo(jogo) {
  const [golsA = 0, golsB = 0] = jogo?.placar || []
  if (Number(golsA) === Number(golsB)) return { empate: true, vencedor: null, devedores: [0, 1] }
  const vencedor = Number(golsA) > Number(golsB) ? 0 : 1
  return { empate: false, vencedor, devedores: [vencedor === 0 ? 1 : 0] }
}

// Quem realmente jogou: os que chegaram. Jogo antigo, sem essa marcação,
// continua valendo pela lista.
export function presentes(jogo) {
  if (!jogo) return []
  return Array.isArray(jogo.chegaram) ? jogo.chegaram : jogo.lista || []
}

function ehIsento(jogadorId, jogadores) {
  return Boolean(jogadores.find((jogador) => jogador.id === jogadorId)?.isento)
}

// Lista de quem deve pagar por causa deste jogo, e quanto.
// Madrugada: quem perdeu ou empatou paga o valor fixo.
// Shekinah: todo mundo que jogou divide o aluguel.
export function quemPaga(pelada, jogo, jogadores) {
  if (!jogo || jogo.status === 'cancelado') return []

  if (pelada?.cobranca === 'mensal') {
    const { devedores } = resultadoDoJogo(jogo)
    const valor = Number(pelada?.config?.valorDerrota || 0)
    const ids = devedores.flatMap((indice) => jogo.times?.[indice]?.jogadores || [])
    return ids
      .filter((jogadorId) => !ehIsento(jogadorId, jogadores))
      .map((jogadorId) => ({ jogadorId, valor }))
  }

  const pagantes = presentes(jogo).filter((jogadorId) => !ehIsento(jogadorId, jogadores))
  const custo = Number(jogo.custo ?? pelada?.config?.valorAluguel ?? 0)
  const { porPessoa } = dividir(custo, pagantes.length)
  return pagantes.map((jogadorId) => ({ jogadorId, valor: porPessoa }))
}

export function resumoDoDinheiroDoJogo(pelada, jogo, jogadores) {
  const cobrancas = quemPaga(pelada, jogo, jogadores)
  const pagos = cobrancas.filter(({ jogadorId }) => jogo?.pagamentos?.[jogadorId]?.pago)
  const somar = (lista) => emReais(lista.reduce((total, item) => total + centavos(item.valor), 0))
  return {
    cobrancas,
    quantidade: cobrancas.length,
    total: somar(cobrancas),
    recebido: somar(pagos),
    falta: emReais(centavos(somar(cobrancas)) - centavos(somar(pagos))),
  }
}

// Sorteio dos times. "ordem" respeita a ordem de chegada; "aleatorio" embaralha.
export function montarTimes(ids, porTime, modo = 'aleatorio', sorteio = Math.random) {
  const fila = modo === 'ordem' ? [...ids] : embaralhar([...ids], sorteio)
  const times = []
  for (let posicao = 0; posicao < fila.length; posicao += porTime) {
    times.push(fila.slice(posicao, posicao + porTime))
  }
  return times
}

export function embaralhar(lista, sorteio = Math.random) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sorteio() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista
}

// Divide em dois times equilibrando as posições (a Madrugada tira na tampinha,
// mas isto serve pro app sugerir quando quiserem).
export function dividirEmDois(ids, jogadores, sorteio = Math.random) {
  const ordem = { goleiro: 0, defesa: 1, meio: 2, ataque: 3 }
  const porPosicao = embaralhar([...ids], sorteio).sort((um, outro) => {
    const posicaoUm = ordem[jogadores.find((j) => j.id === um)?.posicao] ?? 4
    const posicaoOutro = ordem[jogadores.find((j) => j.id === outro)?.posicao] ?? 4
    return posicaoUm - posicaoOutro
  })
  const times = [[], []]
  porPosicao.forEach((jogadorId, indice) => times[indice % 2].push(jogadorId))
  return times
}

// Estatísticas do ano: gols, assistências, presença e resultados.
export function estatisticasDoAno(jogos, jogadores, ano) {
  const doAno = jogos.filter((jogo) => (jogo.data || '').startsWith(String(ano)) && jogo.status !== 'cancelado')
  const tabela = new Map()

  const linha = (jogadorId) => {
    if (!tabela.has(jogadorId)) {
      tabela.set(jogadorId, {
        jogadorId,
        nome: jogadores.find((jogador) => jogador.id === jogadorId)?.nome || 'Jogador',
        gols: 0,
        assistencias: 0,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
      })
    }
    return tabela.get(jogadorId)
  }

  for (const jogo of doAno) {
    for (const jogadorId of presentes(jogo)) linha(jogadorId).jogos += 1
    for (const [jogadorId, gols] of Object.entries(jogo.gols || {})) linha(jogadorId).gols += Number(gols) || 0
    for (const [jogadorId, assistencias] of Object.entries(jogo.assistencias || {})) {
      linha(jogadorId).assistencias += Number(assistencias) || 0
    }
    if (jogo.times?.length === 2 && jogo.placar) {
      const { empate, vencedor } = resultadoDoJogo(jogo)
      jogo.times.forEach((time, indice) => {
        for (const jogadorId of time.jogadores || []) {
          const dados = linha(jogadorId)
          if (empate) dados.empates += 1
          else if (indice === vencedor) dados.vitorias += 1
          else dados.derrotas += 1
        }
      })
    }
  }

  return [...tabela.values()].map((dados) => ({
    ...dados,
    aproveitamento: aproveitamento(dados),
  }))
}

export function aproveitamento({ vitorias, empates, derrotas }) {
  const partidas = vitorias + empates + derrotas
  if (!partidas) return 0
  return Math.round(((vitorias * 3 + empates) / (partidas * 3)) * 100)
}

// Lê a lista que o pessoal cola do grupo: "1- Leandro", "2. Suan ✅", etc.
export function lerNomesColados(texto) {
  return String(texto || '')
    .split(/\r?\n/)
    .map((linha) =>
      linha
        .replace(/^[\s\-–—]*\d+\s*[-.)°ºª:]*\s*/, '')
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
        .replace(/\b\d{1,2}:\d{2}\b/g, '')
        .replace(/[✓✔✅]|☑️?/g, '')
        .trim(),
    )
    .filter((linha) => linha.length >= 2 && /\p{L}/u.test(linha))
    .filter((linha) => !/^(lista|pelada|espera|reserva|confirmados?)\b/i.test(linha))
}

export function semAcento(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// Casa cada nome lido com um jogador cadastrado. Quando não tem certeza,
// devolve a sugestão pra diretoria confirmar.
export function casarNomes(nomes, jogadores) {
  const ativos = jogadores.filter((jogador) => jogador.ativo !== false)
  return nomes.map((lido) => {
    const alvo = semAcento(lido)
    const exato = ativos.find(
      (jogador) => semAcento(jogador.nome) === alvo || semAcento(jogador.apelido) === alvo,
    )
    if (exato) return { lido, jogadorId: exato.id, certeza: 'exato' }

    const comeca = ativos.find((jogador) =>
      [jogador.nome, jogador.apelido]
        .filter(Boolean)
        .some((texto) => semAcento(texto).startsWith(alvo) || alvo.startsWith(semAcento(texto))),
    )
    if (comeca) return { lido, jogadorId: comeca.id, certeza: 'parecido' }

    const parte = ativos.find((jogador) =>
      [jogador.nome, jogador.apelido]
        .filter(Boolean)
        .some((texto) => semAcento(texto).split(' ').includes(alvo)),
    )
    if (parte) return { lido, jogadorId: parte.id, certeza: 'parecido' }

    return { lido, jogadorId: null, certeza: 'novo' }
  })
}

// Quanto um jogador deve no ano: os dias em que ficou devendo mais as
// mensalidades dos meses que já passaram e não foram marcadas.
export function emAbertoDoJogador({ pelada, jogos, jogadores, mensalidades, jogadorId, ano, mesAtual }) {
  const jogador = jogadores.find((item) => item.id === jogadorId)
  const dias = jogos
    .filter((jogo) => String(jogo.data || '').startsWith(String(ano)) && jogo.status !== 'cancelado')
    .map((jogo) => {
      const cobranca = quemPaga(pelada, jogo, jogadores).find((item) => item.jogadorId === jogadorId)
      if (!cobranca) return null
      return { jogo, valor: cobranca.valor, pago: Boolean(jogo.pagamentos?.[jogadorId]?.pago) }
    })
    .filter(Boolean)
    .sort((um, outro) => (outro.jogo.data || '').localeCompare(um.jogo.data || ''))

  const devendoDias = dias.filter((dia) => !dia.pago).reduce((total, dia) => total + centavos(dia.valor), 0)

  let meses = []
  if (pelada?.cobranca === 'mensal' && jogador && !jogador.isento && jogador.ativo !== false) {
    const valor = Number(mensalidades?.valor ?? pelada?.config?.mensalidade ?? 0)
    meses = mesesDoAno().map((mes) => ({
      mes,
      valor,
      situacao: mensalidades?.[`${ano}-${mes}`]?.[jogadorId]?.pago
        ? 'pago'
        : Number(mes) > Number(mesAtual)
          ? 'futuro'
          : 'deve',
    }))
  }
  const devendoMeses = meses
    .filter((mes) => mes.situacao === 'deve')
    .reduce((total, mes) => total + centavos(mes.valor), 0)

  return {
    dias,
    meses,
    total: emReais(devendoDias + devendoMeses),
    totalDias: emReais(devendoDias),
    totalMeses: emReais(devendoMeses),
  }
}

export function mesesDoAno() {
  return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
}

export function nomeDoMes(mes) {
  const nomes = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  return nomes[Number(mes) - 1] || ''
}

// Quem deve mensalidade num mês: jogador ativo, não isento e ainda não marcado.
export function mensalidadesDoMes(jogadores, mensalidades, ano, mes, valor) {
  const marcados = mensalidades?.[`${ano}-${mes}`] || {}
  return jogadores
    .filter((jogador) => jogador.ativo !== false && !jogador.isento)
    .map((jogador) => ({
      jogadorId: jogador.id,
      nome: jogador.nome,
      valor: Number(valor || 0),
      pago: Boolean(marcados[jogador.id]?.pago),
    }))
}
