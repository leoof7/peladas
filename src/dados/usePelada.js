// Acompanha uma pelada: os dados dela, quem é você lá dentro e os jogadores.
import { useEffect, useState } from 'react'
import { assinarColecao, assinarDoc } from './api.js'

export function usePelada(peladaId, usuario) {
  // undefined = ainda carregando, null = não existe
  const [pelada, definirPelada] = useState(undefined)
  const [membro, definirMembro] = useState(undefined)
  const [jogadores, definirJogadores] = useState([])
  const [erro, definirErro] = useState('')

  useEffect(() => {
    if (!peladaId || !usuario) return undefined

    const assinaturas = [
      assinarDoc(`peladas/${peladaId}`, definirPelada, () => {
        definirPelada(null)
        definirErro('Não consegui abrir essa pelada.')
      }),
      assinarDoc(
        `peladas/${peladaId}/membros/${usuario}`,
        definirMembro,
        () => definirMembro(null),
      ),
      assinarColecao(`peladas/${peladaId}/jogadores`, definirJogadores, () => definirJogadores([])),
    ]

    return () => assinaturas.forEach((cancelar) => cancelar())
  }, [peladaId, usuario])

  return {
    pelada,
    membro,
    jogadores,
    erro,
    carregando: pelada === undefined || membro === undefined,
    ehDiretoria: membro?.papel === 'diretoria',
  }
}

export function corDaPelada(pelada) {
  return pelada?.tipo === 'quadra-rateio' ? '#1f4f8f' : '#1e6b3c'
}
