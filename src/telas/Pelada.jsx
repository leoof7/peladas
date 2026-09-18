import { useEffect, useState } from 'react'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { apagar } from '../dados/api.js'
import { esquecerPeladaDoCelular } from '../dados/pelada.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { irPara } from '../util/rotas.js'

export default function Pelada({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [copiado, definirCopiado] = useState(false)

  useEffect(() => {
    if (!carregando && pelada && !membro) irPara(`/p/${peladaId}/entrar`)
  }, [carregando, pelada, membro, peladaId])

  if (carregando) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Abrindo a pelada…</p>
        </div>
      </div>
    )
  }

  if (!pelada) {
    return (
      <div className="app">
        <Cabecalho titulo="Pelada não encontrada" aoVoltar={() => irPara('/')} />
        <div className="conteudo">
          <p className="erro">Não achei essa pelada. Confira o link com a diretoria.</p>
        </div>
      </div>
    )
  }

  const eu = jogadores.find((jogador) => jogador.id === membro?.jogadorId)
  const linkDeConvite = `${window.location.origin}${window.location.pathname}#/p/${peladaId}/entrar`

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkDeConvite)
      definirCopiado(true)
      setTimeout(() => definirCopiado(false), 2000)
    } catch {
      definirCopiado(false)
    }
  }

  async function sair() {
    await apagar(`peladas/${peladaId}/membros/${usuario}`).catch(() => {})
    esquecerPeladaDoCelular(peladaId)
    irPara('/')
  }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo={pelada.nome}
        linha={eu ? `Olá, ${eu.nome}` : pelada.local}
        aoVoltar={() => irPara('/')}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <div className="conteudo">
        <AvisoModoTeste />

        <ul className="lista">
          <li>
            <button type="button" className="lista__item" onClick={() => irPara(`/p/${peladaId}/jogadores`)}>
              <span className="lista__textos">
                <span className="lista__nome">Jogadores</span>
                <span className="lista__detalhe">
                  {jogadores.filter((jogador) => jogador.ativo !== false).length} ativos
                </span>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
          {ehDiretoria && (
            <li>
              <button type="button" className="lista__item" onClick={() => irPara(`/p/${peladaId}/config`)}>
                <span className="lista__textos">
                  <span className="lista__nome">Configurações</span>
                  <span className="lista__detalhe">Códigos, valores e uniformes</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          )}
        </ul>

        {ehDiretoria && (
          <div className="cartao">
            <h2 className="titulo-secao">Chamar o pessoal</h2>
            <p className="ajuda">Manda esse link no grupo. Cada um entra com o código e cria o próprio PIN.</p>
            <button type="button" className="botao botao--contorno" onClick={copiarLink}>
              {copiado ? 'Link copiado' : 'Copiar link da pelada'}
            </button>
          </div>
        )}

        <div className="cartao">
          <h2 className="titulo-secao">Em construção</h2>
          <p className="ajuda">
            O dia de jogo, os pagamentos e o ranking entram nas próximas etapas. Por enquanto dá pra cadastrar
            os jogadores e deixar a pelada pronta.
          </p>
        </div>

        <button type="button" className="botao botao--perigo" onClick={sair}>
          Sair desta pelada neste aparelho
        </button>
      </div>
    </div>
  )
}
