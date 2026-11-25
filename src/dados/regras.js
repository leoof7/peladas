import { arredondar } from './estrelas.js'

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
  if (!Number.isInteger(porTime) || porTime < 1) return []
  const fila = modo === 'ordem' ? [...ids] : embaralhar([...ids], sorteio)
  const times = []
  for (let posicao = 0; posicao < fila.length; posicao += porTime) {
    times.push(fila.slice(posicao, posicao + porTime))
  }
  return times
}

export function dividirCampoPorChegada(ids, limite) {
  const titulares = [...new Set(ids)].slice(0, limite)
  const meio = Math.ceil(titulares.length / 2)
  return [titulares.slice(0, meio), titulares.slice(meio)]
}

export function embaralhar(lista, sorteio = Math.random) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sorteio() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista
}

// Quem não tem nota recebe a média do grupo apenas para o cálculo.
export function pesosDoSorteio(ids, jogadores) {
  const cadastro = new Map(jogadores.map((j) => [j.id, j]))
  const notas = ids.map((id) => arredondar(cadastro.get(id)?.estrelas) * 2).filter(Boolean)
  const media = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : 0
  return new Map(ids.map((id) => [id, {
    peso: arredondar(cadastro.get(id)?.estrelas) * 2 || media,
    goleiro: cadastro.get(id)?.posicao === 'goleiro',
  }]))
}

// Busca a menor diferença possível mantendo tamanho e goleiros equilibrados.
export function dividirEmDois(ids, jogadores, sorteio = Math.random) {
  const fila = embaralhar([...new Set(ids)], sorteio)
  const pesos = pesosDoSorteio(fila, jogadores)
  const tamanho = Math.ceil(fila.length / 2)
  const goleiros = fila.filter((id) => pesos.get(id).goleiro).length
  const total = fila.reduce((soma, id) => soma + pesos.get(id).peso, 0)
  const estados = Array.from({ length: tamanho + 1 }, () => new Map())
  estados[0].set('0:0', { soma: 0, gols: 0, ids: [] })
  for (const id of fila) {
    const { peso, goleiro } = pesos.get(id)
    for (let n = tamanho; n > 0; n--) {
      for (const anterior of estados[n - 1].values()) {
        const soma = anterior.soma + peso
        const gols = anterior.gols + Number(goleiro)
        const chave = soma + ':' + gols
        if (!estados[n].has(chave)) estados[n].set(chave, { soma, gols, ids: [...anterior.ids, id] })
      }
    }
  }
  const melhor = [...estados[tamanho].values()].sort((a, b) =>
    Math.abs(a.gols * 2 - goleiros) - Math.abs(b.gols * 2 - goleiros)
    || Math.abs(a.soma * 2 - total) - Math.abs(b.soma * 2 - total),
  )[0]
  const escolhidos = new Set(melhor.ids)
  return [melhor.ids, fila.filter((id) => !escolhidos.has(id))]
}

// O goleiro não entra no sorteio: ele fica à parte e a diretoria escolhe na
// hora pra qual time vai.
export function separarGoleiros(ids, jogadores) {
  const cadastro = new Map(jogadores.map((jogador) => [jogador.id, jogador]))
  const limpos = [...new Set(ids)]
  return {
    goleiros: limpos.filter((id) => cadastro.get(id)?.posicao === 'goleiro'),
    linha: limpos.filter((id) => cadastro.get(id)?.posicao !== 'goleiro'),
  }
}

// Meia estrela de diferença já é empate na prática: parar aí deixa o sorteio
// variar de verdade a cada "tirar de novo", em vez de cair sempre no mesmo.
const DIFERENCA_BOA = 1

// Divide os jogadores de linha em dois times do mesmo tamanho, deixando a soma
// das estrelas o mais perto possível. Chamar de novo dá outro resultado.
export function sortearDoisTimes(ids, jogadores, sorteio = Math.random, tentativas = 160) {
  const fila = [...new Set(ids)]
  if (fila.length < 2) return [fila, []]
  const pesos = pesosDoSorteio(fila, jogadores)
  const tamanhos = [Math.ceil(fila.length / 2), Math.floor(fila.length / 2)]
  let melhor = null

  for (let volta = 0; volta < tentativas; volta += 1) {
    // Embaralha antes de ordenar: entre os de mesma estrela, a ordem muda.
    const ordem = embaralhar([...fila], sorteio).sort((um, outro) => pesos.get(outro).peso - pesos.get(um).peso)
    const times = [[], []]
    const somas = [0, 0]
    for (const id of ordem) {
      const cabem = [0, 1].filter((lado) => times[lado].length < tamanhos[lado])
      const lado = cabem.sort((um, outro) => somas[um] - somas[outro] || (sorteio() < 0.5 ? -1 : 1))[0]
      times[lado].push(id)
      somas[lado] += pesos.get(id).peso
    }
    const diferenca = Math.abs(somas[0] - somas[1])
    if (!melhor || diferenca < melhor.diferenca) melhor = { times, diferenca }
    if (melhor.diferenca <= DIFERENCA_BOA) break
  }
  return melhor.times
}

// O sorteio inteiro de um dia: goleiros de fora, linha dividida e sobra.
export function sortearTimes(ids, jogadores, { porTime = 5, sorteio = Math.random } = {}) {
  const { goleiros, linha } = separarGoleiros(ids, jogadores)
  const cabem = Math.min(linha.length, porTime * 2)
  const jogam = linha.slice(0, cabem)
  const fora = linha.slice(cabem)
  const times = jogam.length >= 2 ? sortearDoisTimes(jogam, jogadores, sorteio) : [jogam, []]
  const pesos = pesosDoSorteio(linha, jogadores)
  const somar = (time) => time.reduce((total, id) => total + (pesos.get(id)?.peso ?? 0), 0) / 2
  return {
    times,
    goleiros,
    fora,
    somas: times.map(somar),
    diferenca: Math.abs(somar(times[0]) - somar(times[1] || [])),
  }
}

// Mantém a ordem de chegada para definir quem começa e quem fica de fora.
export function montarTimesPorEstrelas(ids, porTime, jogadores, sorteio = Math.random) {
  if (!Number.isInteger(porTime) || porTime < 1) return []
  const fila = [...new Set(ids)]
  if (fila.length < porTime * 2 && fila.length >= 2) return dividirEmDois(fila, jogadores, sorteio)
  const quantidade = Math.max(1, Math.floor(fila.length / porTime))
  const titulares = fila.slice(0, quantidade * porTime)
  const espera = fila.slice(titulares.length)
  let grupos
  if (quantidade === 2) {
    grupos = dividirEmDois(titulares, jogadores, sorteio)
  } else {
    const pesos = pesosDoSorteio(titulares, jogadores)
    const times = Array.from({ length: quantidade }, () => ({ ids: [], peso: 0, gols: 0 }))
    for (const id of embaralhar(titulares, sorteio).sort((a, b) => Number(pesos.get(b).goleiro) - Number(pesos.get(a).goleiro) || pesos.get(b).peso - pesos.get(a).peso)) {
      const { peso, goleiro } = pesos.get(id)
      const [time] = times.filter((item) => item.ids.length < porTime).sort((a, b) => (goleiro ? a.gols - b.gols : 0) || a.peso - b.peso || a.ids.length - b.ids.length)
      time.ids.push(id)
      time.peso += peso
      time.gols += Number(goleiro)
    }
    grupos = times.map((time) => time.ids).filter((time) => time.length)
  }
  return espera.length ? [...grupos, espera] : grupos
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
        .replace(/[✓✔✅★☆*~_]|☑️?|[︎️⃣]/g, '')
        .replace(/^[\s•▪◦+–—-]+/, '')
        .replace(/\s*\((?:pago|confirmado|ok|goleiro|defesa|meio|ataque)\)\s*$/i, '')
        .replace(/\s*,5\s*$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter((linha) => linha.length >= 2 && /\p{L}/u.test(linha))
    .filter((linha) => !/^(lista|pelada|espera|reserva|confirmados?)\b/i.test(linha))
    .filter((linha) => !/^(goleiros?|defesa|defensores|meio(?:-campo)?|ataque|atacantes|linha|de fora)[:\s]*$/i.test(linha))
}

export function semAcento(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function chaveNome(texto) {
  return semAcento(texto).replace(/[^a-z0-9]+/g, ' ').trim()
}

function distancia(a, b) {
  const matriz = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matriz[i][j] = Math.min(matriz[i - 1][j] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matriz[i][j] = Math.min(matriz[i][j], matriz[i - 2][j - 2] + 1)
      }
    }
  }
  return matriz[a.length][b.length]
}

const palavras = (nome) => nome.split(' ').filter((p) => p && !['de','da','do','das','dos','e'].includes(p))

function pontosDoNome(alvo, nome) {
  if (alvo === nome) return 100
  const a = palavras(alvo), b = palavras(nome)
  if (!a.length || !b.length || alvo.length < 3) return 0
  const encaixa = (curto, longo) => {
    let i = 0
    for (const parte of longo) if (parte === curto[i]) i++
    return i === curto.length
  }
  if (encaixa(a, b) || encaixa(b, a)) return 90
  const erro = distancia(alvo, nome)
  if (Math.min(alvo.length, nome.length) >= 4 && erro <= (Math.max(alvo.length, nome.length) >= 9 ? 2 : 1)) return 80 - erro
  if (a.length === 1 && a[0].length >= 5 && b.some((parte) => parte.length >= 5 && distancia(a[0], parte) === 1)) return 72
  // Ex.: “Gabrile Santos” em “Gabriel dos Santos Silva”.
  const quaseEncaixa = (curto, longo) => curto.length >= 2 && curto.length <= longo.length && curto.some((_, i) => {
    if (curto[i].length < 4) return false
    return longo.some((parte) => parte.length >= 4 && distancia(curto[i], parte) === 1 && encaixa(curto.with(i, parte), longo))
  })
  if (quaseEncaixa(a, b) || quaseEncaixa(b, a)) return 75
  return 0
}

// Nomes empatados ficam sem seleção para a diretoria decidir.
export function casarNomes(nomes, jogadores) {
  const ativos = jogadores.filter((j) => j.ativo !== false).map((j) => ({
    id: j.id, nomes: [chaveNome(j.nome), chaveNome(j.apelido)].filter(Boolean),
  }))
  return nomes.map((lido) => {
    const alvo = chaveNome(lido)
    const encontrados = ativos.map(({ id, nomes }) => ({ id, pontos: Math.max(0, ...nomes.map((nome) => pontosDoNome(alvo, nome))) }))
      .filter(({ pontos }) => pontos > 0).sort((a, b) => b.pontos - a.pontos)
    const [melhor, segundo] = encontrados
    if (!melhor) return { lido, jogadorId: null, certeza: 'novo' }
    if (segundo && melhor.pontos - segundo.pontos < 4) return { lido, jogadorId: null, certeza: 'duvida' }
    return { lido, jogadorId: melhor.id, certeza: melhor.pontos === 100 ? 'exato' : 'parecido' }
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
