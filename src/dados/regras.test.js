import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aproveitamento,
  casarNomes,
  dividir,
  dividirEmDois,
  dividirCampoPorChegada,
  emAbertoDoJogador,
  estatisticasDoAno,
  lerNomesColados,
  mensalidadesDoMes,
  montarTimes,
  montarTimesPorEstrelas,
  pesosDoSorteio,
  separarGoleiros,
  sortearTimes,
  quemPaga,
  resultadoDoJogo,
  resumoDoDinheiroDoJogo,
} from './regras.js'

const jogadores = [
  { id: 'a', nome: 'Leandro', posicao: 'meio', ativo: true },
  { id: 'b', nome: 'Wanderley', posicao: 'defesa', ativo: true },
  { id: 'c', nome: 'Zé Luiz', posicao: 'ataque', ativo: true },
  { id: 'd', nome: 'Carlão', posicao: 'goleiro', ativo: true, isento: true },
  { id: 'e', nome: 'Juninho', posicao: 'ataque', ativo: true },
  { id: 'f', nome: 'Beto', posicao: 'goleiro', ativo: true, isento: true },
]

const madrugada = { cobranca: 'mensal', config: { mensalidade: 60, valorDerrota: 2 } }
const shekinah = { cobranca: 'rateio', config: { valorAluguel: 180 } }

test('divide no centavo e mostra a diferença que sobra', () => {
  assert.deepEqual(dividir(180, 14), { porPessoa: 12.86, diferenca: 0.04 })
  assert.deepEqual(dividir(180, 12), { porPessoa: 15, diferenca: 0 })
  assert.deepEqual(dividir(100, 3), { porPessoa: 33.33, diferenca: -0.01 })
  assert.deepEqual(dividir(180, 0), { porPessoa: 0, diferenca: 0 })
})

test('sabe quem ganhou, quem perdeu e quando empatou', () => {
  assert.deepEqual(resultadoDoJogo({ placar: [3, 2] }), { empate: false, vencedor: 0, devedores: [1] })
  assert.deepEqual(resultadoDoJogo({ placar: [1, 4] }), { empate: false, vencedor: 1, devedores: [0] })
  assert.deepEqual(resultadoDoJogo({ placar: [2, 2] }), { empate: true, vencedor: null, devedores: [0, 1] })
})

test('Madrugada: só o time que perdeu paga, e goleiro isento não paga', () => {
  const jogo = {
    data: '2026-09-20',
    placar: [3, 2],
    times: [
      { nome: 'Azul', jogadores: ['a', 'd'] },
      { nome: 'Branco', jogadores: ['b', 'c', 'f'] },
    ],
  }
  assert.deepEqual(quemPaga(madrugada, jogo, jogadores), [
    { jogadorId: 'b', valor: 2 },
    { jogadorId: 'c', valor: 2 },
  ])
})

test('Madrugada: no empate os dois times pagam', () => {
  const jogo = {
    placar: [2, 2],
    times: [
      { nome: 'Azul', jogadores: ['a'] },
      { nome: 'Branco', jogadores: ['b'] },
    ],
  }
  assert.deepEqual(
    quemPaga(madrugada, jogo, jogadores).map(({ jogadorId }) => jogadorId),
    ['a', 'b'],
  )
})

test('domingo cancelado não cobra ninguém', () => {
  const jogo = {
    status: 'cancelado',
    placar: [0, 0],
    times: [{ jogadores: ['a'] }, { jogadores: ['b'] }],
  }
  assert.deepEqual(quemPaga(madrugada, jogo, jogadores), [])
})

test('Shekinah: divide o aluguel por quem jogou, sem contar isento', () => {
  const jogo = { data: '2026-09-23', lista: ['a', 'b', 'c', 'd'], custo: 180 }
  const cobrancas = quemPaga(shekinah, jogo, jogadores)
  assert.deepEqual(
    cobrancas.map(({ jogadorId }) => jogadorId),
    ['a', 'b', 'c'],
  )
  assert.equal(cobrancas[0].valor, 60)
})

test('quem paga é quem chegou, não quem estava na lista', () => {
  const jogo = {
    data: '2026-09-23',
    lista: ['a', 'b', 'c', 'e'],
    chegaram: ['a', 'b'],
    custo: 100,
  }
  const cobrancas = quemPaga(shekinah, jogo, jogadores)
  assert.deepEqual(
    cobrancas.map(({ jogadorId }) => jogadorId),
    ['a', 'b'],
  )
  assert.equal(cobrancas[0].valor, 50)
})

test('presença conta quem chegou', () => {
  const jogos = [{ data: '2026-09-23', lista: ['a', 'b', 'c'], chegaram: ['a'] }]
  const tabela = estatisticasDoAno(jogos, jogadores, 2026)
  assert.equal(tabela.find((linha) => linha.jogadorId === 'a').jogos, 1)
  assert.equal(
    tabela.find((linha) => linha.jogadorId === 'b'),
    undefined,
  )
})

test('casa o nome lido pelo apelido também', () => {
  const comApelido = [
    { id: 'x', nome: 'José Carlos', apelido: 'Zeca', ativo: true },
    { id: 'y', nome: 'Wanderley', apelido: 'Wander', ativo: true },
  ]
  const casados = casarNomes(['zeca', 'Wander', 'Zequinha'], comApelido)
  assert.equal(casados[0].jogadorId, 'x')
  assert.equal(casados[0].certeza, 'exato')
  assert.equal(casados[1].jogadorId, 'y')
  assert.equal(casados[2].jogadorId, null)
})

test('resumo do dinheiro conta o que já entrou e o que falta', () => {
  const jogo = {
    lista: ['a', 'b', 'c'],
    custo: 90,
    pagamentos: { a: { pago: true } },
  }
  const resumo = resumoDoDinheiroDoJogo(shekinah, jogo, jogadores)
  assert.equal(resumo.quantidade, 3)
  assert.equal(resumo.total, 90)
  assert.equal(resumo.recebido, 30)
  assert.equal(resumo.falta, 60)
})

test('monta times na ordem de chegada e no sorteio', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  assert.deepEqual(montarTimes(ids, 3, 'ordem'), [
    ['a', 'b', 'c'],
    ['d', 'e', 'f'],
  ])
  const sorteados = montarTimes(ids, 2, 'aleatorio')
  assert.equal(sorteados.length, 3)
  assert.deepEqual(sorteados.flat().sort(), [...ids].sort())
})

test('divide em dois times com o mesmo tamanho e sem repetir ninguém', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  const [um, outro] = dividirEmDois(ids, jogadores)
  assert.equal(um.length, 3)
  assert.equal(outro.length, 3)
  assert.deepEqual([...um, ...outro].sort(), [...ids].sort())
})

test('campo por chegada mantém a sequência e respeita o limite de quem começa', () => {
  assert.deepEqual(dividirCampoPorChegada(['a', 'b', 'b', 'c', 'd', 'e', 'f'], 5), [
    ['a', 'b', 'c'],
    ['d', 'e'],
  ])
})

test('estatísticas somam gols, assistências, presença e resultados do ano', () => {
  const jogos = [
    {
      data: '2026-09-20',
      lista: ['a', 'b'],
      placar: [2, 1],
      gols: { a: 2 },
      assistencias: { b: 1 },
      times: [{ jogadores: ['a'] }, { jogadores: ['b'] }],
    },
    {
      data: '2026-09-27',
      lista: ['a', 'b'],
      placar: [1, 1],
      gols: { b: 1 },
      times: [{ jogadores: ['a'] }, { jogadores: ['b'] }],
    },
    { data: '2025-09-20', lista: ['a'], gols: { a: 9 } },
    { data: '2026-10-04', status: 'cancelado', lista: ['a'], gols: { a: 5 } },
  ]
  const tabela = estatisticasDoAno(jogos, jogadores, 2026)
  const leandro = tabela.find((linha) => linha.jogadorId === 'a')
  assert.equal(leandro.gols, 2)
  assert.equal(leandro.jogos, 2)
  assert.equal(leandro.vitorias, 1)
  assert.equal(leandro.empates, 1)
  assert.equal(leandro.derrotas, 0)
  assert.equal(leandro.aproveitamento, 67)

  const wanderley = tabela.find((linha) => linha.jogadorId === 'b')
  assert.equal(wanderley.gols, 1)
  assert.equal(wanderley.assistencias, 1)
  assert.equal(wanderley.derrotas, 1)
})

test('aproveitamento em porcentagem', () => {
  assert.equal(aproveitamento({ vitorias: 3, empates: 0, derrotas: 0 }), 100)
  assert.equal(aproveitamento({ vitorias: 0, empates: 0, derrotas: 2 }), 0)
  assert.equal(aproveitamento({ vitorias: 0, empates: 0, derrotas: 0 }), 0)
})

test('lê a lista colada do grupo', () => {
  const texto = `PELADA QUARTA 21H
1- Leandro ✅
2. Wanderley
3 - Zé Luiz
4-
Lista de espera:
5- Beto 21:30`
  assert.deepEqual(lerNomesColados(texto), ['Leandro', 'Wanderley', 'Zé Luiz', 'Beto'])
})

test('casa os nomes lidos com os jogadores cadastrados', () => {
  const casados = casarNomes(['leandro', 'ze luiz', 'Fulano Novo'], jogadores)
  assert.equal(casados[0].jogadorId, 'a')
  assert.equal(casados[0].certeza, 'exato')
  assert.equal(casados[1].jogadorId, 'c')
  assert.equal(casados[2].jogadorId, null)
  assert.equal(casados[2].certeza, 'novo')
})

test('em aberto do jogador soma os domingos devidos e os meses vencidos', () => {
  const jogos = [
    {
      id: 'j1',
      data: '2026-09-06',
      placar: [1, 2],
      times: [{ jogadores: ['a'] }, { jogadores: ['b'] }],
      pagamentos: {},
    },
    {
      id: 'j2',
      data: '2026-09-13',
      placar: [0, 3],
      times: [{ jogadores: ['a'] }, { jogadores: ['b'] }],
      pagamentos: { a: { pago: true } },
    },
  ]
  const mensalidades = { valor: 60, '2026-07': { a: { pago: true } }, '2026-08': { a: { pago: true } } }
  const conta = emAbertoDoJogador({
    pelada: madrugada,
    jogos,
    jogadores,
    mensalidades,
    jogadorId: 'a',
    ano: 2026,
    mesAtual: '09',
  })
  // Deve o domingo 06 (R$ 2) e as mensalidades de janeiro a junho e setembro (7 x 60).
  assert.equal(conta.totalDias, 2)
  assert.equal(conta.totalMeses, 420)
  assert.equal(conta.total, 422)
  assert.equal(conta.dias.length, 2)
  assert.equal(conta.meses.filter((mes) => mes.situacao === 'futuro').length, 3)
})

test('goleiro isento não deve mensalidade nenhuma', () => {
  const conta = emAbertoDoJogador({
    pelada: madrugada,
    jogos: [],
    jogadores,
    mensalidades: { valor: 60 },
    jogadorId: 'd',
    ano: 2026,
    mesAtual: '12',
  })
  assert.equal(conta.total, 0)
  assert.deepEqual(conta.meses, [])
})

test('mensalidade não é cobrada de isento nem de quem saiu', () => {
  const lista = mensalidadesDoMes(
    [...jogadores, { id: 'g', nome: 'Saiu', ativo: false }],
    { '2026-09': { a: { pago: true } } },
    2026,
    '09',
    60,
  )
  assert.deepEqual(
    lista.map(({ jogadorId }) => jogadorId),
    ['a', 'b', 'c', 'e'],
  )
  assert.equal(lista[0].pago, true)
  assert.equal(lista[1].pago, false)
  assert.equal(lista[0].valor, 60)
})

test('equilibra exatamente as meias estrelas e coloca um goleiro em cada time', () => {
  const cadastro = [5, 2.5, 3, 4, 3.5, 3].map((estrelas, id) => ({
    id: String(id), estrelas, posicao: id === 2 || id === 5 ? 'goleiro' : 'defesa',
  }))
  const ids = cadastro.map((j) => j.id)
  const times = dividirEmDois(ids, cadastro, () => 0.7)
  for (const time of times) {
    assert.equal(time.length, 3)
    assert.equal(time.filter((id) => cadastro[Number(id)].posicao === 'goleiro').length, 1)
    assert.equal(time.reduce((soma, id) => soma + cadastro[Number(id)].estrelas, 0), 10.5)
  }
  assert.deepEqual(times.flat().sort(), ids)
})

test('sorteio de quadra mantém o rodízio e não perde quem chegou', () => {
  const ids = Array.from({ length: 12 }, (_, i) => String(i))
  const cadastro = ids.map((id) => ({ id, estrelas: id === '1' ? 0 : 3.5 }))
  const times = montarTimesPorEstrelas(ids, 5, cadastro, () => 0.2)
  assert.deepEqual(times.map((time) => time.length), [5, 5, 2])
  assert.deepEqual(times[2], ids.slice(10))
  assert.equal(new Set(times.flat()).size, 12)
  assert.deepEqual(montarTimesPorEstrelas(ids.slice(0, 9), 5, cadastro).map((time) => time.length), [5, 4])
  assert.equal(pesosDoSorteio(ids, cadastro).get('1').peso, 7)
  assert.deepEqual(montarTimes(ids, 0), [])
})

test('importação sugere sobrenomes e grafias próximas, mas não escolhe nomes empatados', () => {
  const cadastro = [
    { id: 'g', nome: 'Gabriel dos Santos Silva', apelido: 'Biel' },
    { id: 'p', nome: 'Paulo Silva', apelido: 'Paulinho' },
    { id: 'd', nome: 'Paulo Andrade' },
    { id: 'x', nome: 'José Pereira', ativo: false },
  ]
  const nomes = lerNomesColados('**Goleiros**\n1. Biel ✅\n2. Gabrile Santos\n3. Andrade (confirmado)\n4. Silva\n5. Paulo\n6. José Pereira')
  assert.deepEqual(casarNomes(nomes, cadastro).map(({ jogadorId, certeza }) => [jogadorId, certeza]), [
    ['g', 'exato'], ['g', 'parecido'], ['d', 'parecido'], [null, 'duvida'], [null, 'duvida'], [null, 'novo'],
  ])
})

test('goleiro fica de fora do sorteio', () => {
  const jogadores = [
    { id: 'g1', nome: 'Derick', posicao: 'goleiro', estrelas: 4 },
    { id: 'g2', nome: 'Henrique', posicao: 'goleiro', estrelas: 3 },
    { id: 'a', nome: 'Léo', posicao: 'meio', estrelas: 5 },
    { id: 'b', nome: 'Suan', posicao: 'defesa', estrelas: 3 },
  ]
  const { goleiros, linha } = separarGoleiros(['g1', 'a', 'g2', 'b'], jogadores)
  assert.deepEqual(goleiros, ['g1', 'g2'])
  assert.deepEqual(linha, ['a', 'b'])
})

test('o sorteio divide só a linha e equilibra as estrelas', () => {
  const jogadores = [
    { id: 'gol', posicao: 'goleiro', estrelas: 4 },
    { id: 'a', posicao: 'meio', estrelas: 5 },
    { id: 'b', posicao: 'meio', estrelas: 5 },
    { id: 'c', posicao: 'defesa', estrelas: 2 },
    { id: 'd', posicao: 'defesa', estrelas: 2 },
  ]
  const resultado = sortearTimes(['gol', 'a', 'b', 'c', 'd'], jogadores, { porTime: 2 })
  assert.deepEqual(resultado.goleiros, ['gol'])
  assert.equal(resultado.times[0].length, 2)
  assert.equal(resultado.times[1].length, 2)
  assert.equal(resultado.fora.length, 0)
  // 5+2 de cada lado: os dois times somam 7 estrelas
  assert.equal(resultado.diferenca, 0)
  assert.deepEqual(resultado.somas, [7, 7])
  const todos = [...resultado.times[0], ...resultado.times[1]].sort()
  assert.deepEqual(todos, ['a', 'b', 'c', 'd'])
})

test('quem passa do tamanho do time fica de fora, sem goleiro no meio', () => {
  const jogadores = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, posicao: 'meio', estrelas: 3 }))
  jogadores.push({ id: 'gol', posicao: 'goleiro', estrelas: 5 })
  const { times, fora, goleiros } = sortearTimes(['a', 'b', 'gol', 'c', 'd', 'e'], jogadores, { porTime: 2 })
  assert.deepEqual(goleiros, ['gol'])
  assert.equal(times[0].length + times[1].length, 4)
  assert.equal(fora.length, 1)
  assert.ok(!fora.includes('gol'))
})

test('tirar de novo pode dar outro time', () => {
  const jogadores = Array.from({ length: 10 }, (_, i) => ({
    id: `j${i}`, posicao: 'meio', estrelas: [5, 4, 4, 3, 3, 3, 3, 2, 2, 1][i],
  }))
  const ids = jogadores.map((jogador) => jogador.id)
  const resultados = new Set()
  for (let volta = 0; volta < 40; volta += 1) {
    resultados.add(JSON.stringify(sortearTimes(ids, jogadores, { porTime: 5 }).times[0].sort()))
  }
  assert.ok(resultados.size > 1, 'o sorteio deveria variar entre as chamadas')
})

test('mesmo variando, o sorteio não deixa os times desequilibrados', () => {
  const jogadores = Array.from({ length: 10 }, (_, i) => ({
    id: `j${i}`, posicao: 'meio', estrelas: [5, 4.5, 4, 3.5, 3, 3, 2.5, 2, 1.5, 1][i],
  }))
  const ids = jogadores.map((jogador) => jogador.id)
  for (let volta = 0; volta < 30; volta += 1) {
    const { diferenca } = sortearTimes(ids, jogadores, { porTime: 5 })
    assert.ok(diferenca <= 0.5, `diferença de ${diferenca} estrelas é demais`)
  }
})
