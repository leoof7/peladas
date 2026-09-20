import { useEffect, useState } from 'react'
import { entrar } from './dados/api.js'
import { useRota } from './util/rotas.js'
import Inicial from './telas/Inicial.jsx'
import Criar from './telas/Criar.jsx'
import Entrar from './telas/Entrar.jsx'
import Pelada from './telas/Pelada.jsx'
import Jogadores from './telas/Jogadores.jsx'
import Config from './telas/Config.jsx'
import Jogos from './telas/Jogos.jsx'
import Jogo from './telas/Jogo.jsx'
import Ranking from './telas/Ranking.jsx'
import Financeiro from './telas/Financeiro.jsx'
import MeusGols from './telas/MeusGols.jsx'

export default function App() {
  const rota = useRota()
  const [usuario, definirUsuario] = useState(null)
  const [falha, definirFalha] = useState('')

  useEffect(() => {
    let ativo = true
    entrar()
      .then((identificador) => ativo && definirUsuario(identificador))
      .catch(() => ativo && definirFalha('Não consegui iniciar o app. Confira a internet e tente de novo.'))
    return () => {
      ativo = false
    }
  }, [])

  if (falha) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="erro">{falha}</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Abrindo…</p>
        </div>
      </div>
    )
  }

  const [secao, peladaId, subtela, detalhe] = rota

  if (secao === 'nova') return <Criar usuario={usuario} />

  if (secao === 'p' && peladaId) {
    if (subtela === 'entrar') return <Entrar peladaId={peladaId} usuario={usuario} />
    if (subtela === 'jogadores') return <Jogadores peladaId={peladaId} usuario={usuario} />
    if (subtela === 'config') return <Config peladaId={peladaId} usuario={usuario} />
    if (subtela === 'jogos') return <Jogos peladaId={peladaId} usuario={usuario} />
    if (subtela === 'j' && detalhe) return <Jogo peladaId={peladaId} jogoId={detalhe} usuario={usuario} />
    if (subtela === 'ranking') return <Ranking peladaId={peladaId} usuario={usuario} />
    if (subtela === 'financeiro') return <Financeiro peladaId={peladaId} usuario={usuario} />
    if (subtela === 'meus-gols') return <MeusGols peladaId={peladaId} usuario={usuario} />
    return <Pelada peladaId={peladaId} usuario={usuario} />
  }

  return <Inicial />
}
