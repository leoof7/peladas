// Acompanha uma lista (coleção) ou um documento do banco.
import { useEffect, useState } from 'react'
import { assinarColecao, assinarDoc } from './api.js'

export function useColecao(caminho) {
  const [itens, definirItens] = useState([])

  useEffect(() => {
    if (!caminho) return undefined
    return assinarColecao(caminho, definirItens, () => definirItens([]))
  }, [caminho])

  return itens
}

export function useDoc(caminho) {
  const [documento, definirDocumento] = useState(null)

  useEffect(() => {
    if (!caminho) return undefined
    return assinarDoc(caminho, definirDocumento, () => definirDocumento(null))
  }, [caminho])

  return documento
}
