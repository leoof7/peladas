import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aproveitamento,
  casarNomes,
  dividir,
  dividirEmDois,
  emAbertoDoJogador,
  estatisticasDoAno,
  lerNomesColados,
  mensalidadesDoMes,
  montarTimes,
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
