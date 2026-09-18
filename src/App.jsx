import { useEffect, useState } from 'react'
import { entrar } from './dados/api.js'
import { useRota } from './util/rotas.js'
import Inicial from './telas/Inicial.jsx'
import Criar from './telas/Criar.jsx'
import Entrar from './telas/Entrar.jsx'
import Pelada from './telas/Pelada.jsx'
import Jogadores from './telas/Jogadores.jsx'
import Config from './telas/Config.jsx'

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

  const [secao, peladaId, subtela] = rota

  if (secao === 'nova') return <Criar usuario={usuario} />

  if (secao === 'p' && peladaId) {
    if (subtela === 'entrar') return <Entrar peladaId={peladaId} usuario={usuario} />
    if (subtela === 'jogadores') return <Jogadores peladaId={peladaId} usuario={usuario} />
    if (subtela === 'config') return <Config peladaId={peladaId} usuario={usuario} />
    return <Pelada peladaId={peladaId} usuario={usuario} />
  }

  return <Inicial />
}
