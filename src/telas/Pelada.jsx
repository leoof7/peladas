import { useEffect, useState } from 'react'
import Abas from '../componentes/Abas.jsx'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { apagar, assinarDoc } from '../dados/api.js'
import { esquecerPeladaDoCelular } from '../dados/pelada.js'
import { emAbertoDoJogador, estatisticasDoAno, presentes, resultadoDoJogo } from '../dados/regras.js'
import { useColecao, useDoc } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { anoDe, dataCurta, dinheiro, hoje } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

export default function Pelada({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const jogos = useColecao(peladaId ? `peladas/${peladaId}/jogos` : null)
  const ano = anoDe(hoje())
  const mensalidades = useDoc(peladaId ? `peladas/${peladaId}/mensalidades/${ano}` : null)
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

  const ehMensal = pelada.cobranca === 'mensal'
  const eu = jogadores.find((jogador) => jogador.id === membro?.jogadorId)
  const ativos = jogadores.filter((jogador) => jogador.ativo !== false)
  const linkDaPelada = `${window.location.origin}${window.location.pathname}#/p/${peladaId}/entrar`

  const ordenados = [...jogos].sort((um, outro) => (outro.data || '').localeCompare(um.data || ''))
  const emAndamento = ordenados.find((jogo) => jogo.status === 'aberto' && (jogo.data || '') >= hoje())
  const ultimo = ordenados.find((jogo) => jogo.status !== 'cancelado' && (jogo.data || '') <= hoje())

  const minhaConta = membro?.jogadorId
    ? emAbertoDoJogador({
        pelada,
        jogos,
        jogadores,
        mensalidades,
        jogadorId: membro.jogadorId,
        ano,
        mesAtual: hoje().slice(5, 7),
      })
    : null

  const artilharia = estatisticasDoAno(jogos, jogadores, ano)
    .filter((linha) => linha.gols > 0)
    .sort((um, outro) => outro.gols - um.gols)
    .slice(0, 3)

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

        {emAndamento ? (
          <section className="cartao">
            <h2 className="titulo-secao">{ehMensal ? 'Domingo em aberto' : 'Pelada em aberto'}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 28, textTransform: 'uppercase' }}>
                {dataCurta(emAndamento.data)}
              </span>
              <span className="lista__detalhe">{presentes(emAndamento).length} chegaram</span>
            </div>
            <button
              type="button"
              className="botao botao--principal"
              onClick={() => irPara(`/p/${peladaId}/j/${emAndamento.id}`)}
            >
              Abrir o dia
            </button>
          </section>
        ) : (
          ehDiretoria && (
            <button type="button" className="botao botao--principal" onClick={() => irPara(`/p/${peladaId}/jogos`)}>
              {ehMensal ? 'Abrir o domingo' : 'Abrir uma pelada'}
            </button>
          )
        )}

        {ultimo && (
          <section className="cartao">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="titulo-secao">{ehMensal ? 'Último domingo' : 'Última pelada'}</h2>
              <span className="lista__detalhe">{dataCurta(ultimo.data)}</span>
            </div>
            {ehMensal && ultimo.times?.length === 2 && ultimo.placar ? (
              <>
                <div className="placar">
                  <span className="placar__time">{ultimo.times[0].nome}</span>
                  <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 40 }}>
                    {ultimo.placar.join(' × ')}
                  </span>
                  <span className="placar__time">{ultimo.times[1].nome}</span>
                </div>
                <p className="ajuda centro">
                  {resultadoDoJogo(ultimo).empate
                    ? 'Empate: os dois times pagaram.'
                    : `${ultimo.times[resultadoDoJogo(ultimo).vencedor].nome} venceu.`}
                </p>
              </>
            ) : (
              <p className="ajuda">{presentes(ultimo).length} jogaram.</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="botao"
                style={{ flex: 1 }}
                onClick={() => irPara(`/p/${peladaId}/j/${ultimo.id}`)}
              >
                Ver o dia
              </button>
              {membro?.jogadorId && (
                <button
                  type="button"
                  className="botao botao--contorno"
                  style={{ flex: 1 }}
                  onClick={() => irPara(`/p/${peladaId}/meus-gols`)}
                >
                  Lançar meus gols
                </button>
              )}
            </div>
          </section>
        )}

        {minhaConta && (
          <section className="cartao">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="titulo-secao">Meu financeiro</h2>
              <span className="lista__detalhe">só você vê</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>Em aberto</span>
              <span
                style={{
                  fontFamily: 'var(--titulo)',
                  fontWeight: 800,
                  fontSize: 36,
                  color: minhaConta.total > 0 ? 'var(--alerta)' : 'var(--ok)',
                }}
              >
                {dinheiro(minhaConta.total)}
              </span>
            </div>
            <button
              type="button"
              className="botao botao--contorno"
              onClick={() => irPara(`/p/${peladaId}/financeiro`)}
            >
              Ver e pagar
            </button>
          </section>
        )}

        <section className="cartao">
          <div className="numeros">
            <div className="numero">
              <span className="numero__valor">{ativos.length}</span>
              <span className="numero__nome">jogadores</span>
            </div>
            <div className="numero">
              <span className="numero__valor">{jogos.filter((jogo) => jogo.status !== 'cancelado').length}</span>
              <span className="numero__nome">{ehMensal ? 'domingos' : 'peladas'}</span>
            </div>
            <div className="numero">
              <span className="numero__valor">
                {ehMensal ? dinheiro(pelada.config?.mensalidade) : dinheiro(pelada.config?.valorAluguel)}
              </span>
              <span className="numero__nome">{ehMensal ? 'por mês' : 'a quadra'}</span>
            </div>
          </div>
        </section>

        {artilharia.length > 0 && (
          <section className="cartao">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="titulo-secao">Artilharia {ano}</h2>
              <button
                type="button"
                className="botao botao--pequeno"
                onClick={() => irPara(`/p/${peladaId}/ranking`)}
              >
                Ver ranking
              </button>
            </div>
            {artilharia.map((linha, posicao) => (
              <div key={linha.jogadorId} className="linha">
                <span style={{ width: 24, fontWeight: 800 }}>{posicao + 1}</span>
                <span className="linha__nome">{linha.nome}</span>
                <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 22 }}>{linha.gols}</span>
              </div>
            ))}
          </section>
        )}

        {ehDiretoria && (
          <section className="cartao">
            <h2 className="titulo-secao">Chamar o pessoal</h2>
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
                {copiado === 'codigo' ? 'Copiado' : 'Copiar código'}
              </button>
              <button
                type="button"
                className="botao botao--contorno"
                style={{ flex: 1 }}
                onClick={() => copiar('link', linkDaPelada)}
              >
                {copiado === 'link' ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
            <button type="button" className="botao" onClick={() => irPara(`/p/${peladaId}/config`)}>
              Configurações da pelada
            </button>
          </section>
        )}

        <button type="button" className="botao botao--perigo" onClick={sair}>
          Sair desta pelada neste aparelho
        </button>
      </div>
      <Abas peladaId={peladaId} atual="inicio" ehMensal={ehMensal} />
    </div>
  )
}
