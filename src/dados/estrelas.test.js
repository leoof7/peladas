import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  arredondar,
  estrelasEmTexto,
  mediaDoGrupo,
  notaEmNumero,
  ordenarPorEstrela,
  textoPraColar,
} from './estrelas.js'

test('a nota só anda de meia em meia e não passa de 5', () => {
  assert.equal(arredondar(3.3), 3.5)
  assert.equal(arredondar(3.2), 3)
  assert.equal(arredondar(9), 5)
  assert.equal(arredondar(-2), 0)
  assert.equal(arredondar('abacaxi'), 0)
})

test('escreve a estrela do jeito que o grupo escreve', () => {
  assert.equal(estrelasEmTexto(5), '⭐⭐⭐⭐⭐')
  assert.equal(estrelasEmTexto(3.5), '⭐⭐⭐,5')
  assert.equal(estrelasEmTexto(2), '⭐⭐')
  assert.equal(estrelasEmTexto(0.5), '0,5')
  assert.equal(estrelasEmTexto(0), 'sem nota')
})

test('mostra o número do jeito brasileiro', () => {
  assert.equal(notaEmNumero(4), '4')
  assert.equal(notaEmNumero(2.5), '2,5')
})

test('maior estrela primeiro, empate vai pelo alfabeto', () => {
  const ordem = ordenarPorEstrela([
    { nome: 'Suan', estrelas: 3 },
    { nome: 'Rafael', estrelas: 5 },
    { nome: 'Murilo', estrelas: 3 },
  ]).map((jogador) => jogador.nome)
  assert.deepEqual(ordem, ['Rafael', 'Murilo', 'Suan'])
})

test('quem está sem nota não entra na média', () => {
  assert.equal(mediaDoGrupo([{ estrelas: 4 }, { estrelas: 3 }, { estrelas: 0 }]), 3.5)
  assert.equal(mediaDoGrupo([{ estrelas: 0 }]), 0)
  assert.equal(mediaDoGrupo([]), 0)
})

test('o texto pra colar sai separado por posição e ordenado', () => {
  const texto = textoPraColar([
    { nome: 'Suan', posicao: 'defesa', estrelas: 3 },
    { nome: 'Derick', posicao: 'goleiro', estrelas: 5 },
    { nome: 'Felipe Mendes', posicao: 'defesa', estrelas: 4 },
    { nome: 'Tio du', posicao: 'ataque', estrelas: 3.5 },
  ])
  assert.equal(
    texto,
    [
      '*Goleiros*',
      'Derick ⭐⭐⭐⭐⭐',
      '',
      '*Defensores*',
      'Felipe Mendes ⭐⭐⭐⭐',
      'Suan ⭐⭐⭐',
      '',
      '*Atacantes*',
      'Tio du ⭐⭐⭐,5',
    ].join('\n'),
  )
})

test('posição sem ninguém não vira título vazio', () => {
  const texto = textoPraColar([{ nome: 'Pires', posicao: 'ataque', estrelas: 3 }])
  assert.equal(texto, '*Atacantes*\nPires ⭐⭐⭐')
})
