import { useEffect, useState } from 'react'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { apagar, assinarDoc } from '../dados/api.js'
import { esquecerPeladaDoCelular } from '../dados/pelada.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { dinheiro } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

export default function Pelada({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [codigos, definirCodigos] = useState(null)
  const [copiado, definirCopiado] = useState('')

  useEffect(() => {
    if (!carregando && pelada && !membro) irPara(`/p/${peladaId}/entrar`)
  }, [carregando, pelada, membro, peladaId])

  useEffect(() => {
    if (!ehDiretoria) return undefined
    return assinarDoc(`peladas/${peladaId}/privado/codigos`, definirCodigos, () => definirCodigos(null))
  }, [peladaId, ehDiretoria])

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
          <p className="erro">Não achei essa pelada.</p>
          <p className="ajuda">Ou o link veio errado, ou essa pelada ainda não foi criada.</p>
          <button type="button" className="botao botao--principal" onClick={() => irPara('/nova')}>
            Criar uma pelada
          </button>
          <button type="button" className="botao" onClick={() => irPara('/')}>
            Voltar pro início
          </button>
        </div>
      </div>
    )
  }

  const eu = jogadores.find((jogador) => jogador.id === membro?.jogadorId)
  const ativos = jogadores.filter((jogador) => jogador.ativo !== false)
  const goleiros = ativos.filter((jogador) => jogador.posicao === 'goleiro')
  const config = pelada.config || {}
  const ehMensal = pelada.cobranca === 'mensal'
  const linkDaPelada = `${window.location.origin}${window.location.pathname}#/p/${peladaId}/entrar`

  async function copiar(oQue, texto) {
    try {
      await navigator.clipboard.writeText(texto)
      definirCopiado(oQue)
      setTimeout(() => definirCopiado(''), 2000)
    } catch {
      definirCopiado('')
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

        <section className="cartao">
          <h2 className="titulo-secao">A pelada</h2>
          <div className="numeros">
            <div className="numero">
              <span className="numero__valor">{ativos.length}</span>
              <span className="numero__nome">jogadores</span>
            </div>
            <div className="numero">
              <span className="numero__valor">{goleiros.length}</span>
              <span className="numero__nome">goleiros</span>
            </div>
            <div className="numero">
              <span className="numero__valor">{ehMensal ? config.jogamPorDia || 22 : config.limiteVagas || 20}</span>
              <span className="numero__nome">{ehMensal ? 'jogam por domingo' : 'vagas na lista'}</span>
            </div>
          </div>
          <p className="ajuda">
            {ehMensal ? (
              <>
                {pelada.local} · mensalidade de <strong>{dinheiro(config.mensalidade)}</strong>, mais{' '}
                <strong>{dinheiro(config.valorDerrota)}</strong> por domingo pra quem perde ou empata.
              </>
            ) : (
              <>
                {pelada.local} · aluguel de <strong>{dinheiro(config.valorAluguel)}</strong> dividido por quem
                jogou · {config.naLinhaPorTime || 5} na linha por time.
              </>
            )}
          </p>
        </section>

        <ul className="lista">
          <li>
            <button type="button" className="lista__item" onClick={() => irPara(`/p/${peladaId}/jogadores`)}>
              <span className="lista__textos">
                <span className="lista__nome">Jogadores</span>
                <span className="lista__detalhe">Cadastrar, editar e zerar PIN</span>
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
          <section className="cartao">
            <h2 className="titulo-secao">Chamar o pessoal</h2>
            <p className="ajuda">
              Manda o link no grupo com o código. Cada um acha o próprio nome na lista e cria o PIN dele.
            </p>
            <div className="destaque-codigo">
              <span className="destaque-codigo__rotulo">Código dos jogadores</span>
              <span className="destaque-codigo__valor">{codigos?.participante || '······'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="botao botao--contorno"
                style={{ flex: 1 }}
                onClick={() => copiar('codigo', codigos?.participante || '')}
                disabled={!codigos?.participante}
              >
                {copiado === 'codigo' ? 'Código copiado' : 'Copiar código'}
              </button>
              <button
                type="button"
                className="botao botao--contorno"
                style={{ flex: 1 }}
                onClick={() => copiar('link', linkDaPelada)}
              >
                {copiado === 'link' ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          </section>
        )}

        <section className="cartao">
          <h2 className="titulo-secao">O que vem por aí</h2>
          <ul className="etapas">
            <li>
              <strong>Domingo de jogo</strong> — chegada, times com uniforme, placar, gols e assistências.
            </li>
            <li>
              <strong>Dinheiro</strong> — quem pagou, Pix pra copiar a chave e o caixa da pelada.
            </li>
            <li>
              <strong>Ranking do ano</strong> — artilheiro, garçom, presença e aproveitamento.
            </li>
          </ul>
          <p className="ajuda">Por enquanto dá pra deixar a pelada pronta: jogadores, valores e códigos.</p>
        </section>

        <button type="button" className="botao botao--perigo" onClick={sair}>
          Sair desta pelada neste aparelho
        </button>
      </div>
    </div>
  )
}
