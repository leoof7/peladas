import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerEstrelasColadas } from './importarEstrelas.js'

test('importa meia estrela e exige revisão para substituir uma nota', () => {
  const cadastro = [{ id: 'a', nome: 'Ana', apelido: 'Aninha' }, { id: 'b', nome: 'Beto', estrelas: 2 }]
  const resultado = lerEstrelasColadas('Goleiros\n1. Aninha⭐⭐⭐,5\nBeto ★★★\nOutro 0,5\nAna ⭐⭐⭐⭐⭐⭐', cadastro)
  assert.deepEqual(resultado.map(({ jogadorId, nota, aplicar }) => [jogadorId, nota, aplicar]), [
    ['a', 3.5, true], ['b', 3, false], [null, 0.5, false],
  ])
})

test('não escolhe automaticamente entre notas repetidas para o mesmo cadastro', () => {
  const resultado = lerEstrelasColadas('Ana ⭐\nAninha ⭐⭐', [{ id: 'a', nome: 'Ana', apelido: 'Aninha' }])
  assert.equal(resultado.length, 2)
  assert.ok(resultado.every((item) => item.repetido && !item.aplicar))
})
