import { useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import Contador from '../componentes/Contador.jsx'
import { agora, gravar, novoId } from '../dados/api.js'
import { presentes } from '../dados/regras.js'
import { useColecao } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { dataCurta } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

// O jogador lança os próprios gols. Só vale depois que a diretoria aprova.
export default function MeusGols({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando } = usePelada(peladaId, usuario)
  const jogos = useColecao(peladaId ? `peladas/${peladaId}/jogos` : null)
  const lancamentos = useColecao(peladaId ? `peladas/${peladaId}/lancamentos` : null)
  const [escolhido, definirEscolhido] = useState(null)
  const [numeros, definirNumeros] = useState(null)
  const [recado, definirRecado] = useState('')
  const [erro, definirErro] = useState('')

  if (carregando) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!membro) {
    irPara(`/p/${peladaId}/entrar`)
    return null
  }

  const meuId = membro.jogadorId
  const meus = jogos
    .filter((jogo) => presentes(jogo).includes(meuId) && jogo.status !== 'cancelado')
    .sort((um, outro) => (outro.data || '').localeCompare(um.data || ''))
    .slice(0, 6)
  const jogo = meus.find((item) => item.id === escolhido) || meus[0]
  const meusLancamentos = lancamentos
    .filter((lancamento) => lancamento.jogadorId === meuId)
    .sort((um, outro) => (outro.criadoEm || '').localeCompare(um.criadoEm || ''))

  const pendente = jogo && meusLancamentos.find((item) => item.jogoId === jogo.id && item.situacao === 'aguardando')
  const valores = numeros || {
    gols: Number(pendente?.gols ?? jogo?.gols?.[meuId] ?? 0),
    assistencias: Number(pendente?.assistencias ?? jogo?.assistencias?.[meuId] ?? 0),
  }

  async function enviar() {
    if (!jogo) return
    try {
      await gravar(
        `peladas/${peladaId}/lancamentos/${pendente?.id || novoId()}`,
        {
          jogoId: jogo.id,
          jogadorId: meuId,
          usuario,
          gols: valores.gols,
          assistencias: valores.assistencias,
          situacao: 'aguardando',
          criadoEm: agora(),
        },
        { mesclar: false },
      )
      definirRecado('Enviado. A diretoria vai conferir.')
      definirErro('')
      setTimeout(() => definirRecado(''), 3000)
    } catch {
      definirErro('Não consegui enviar. Tente de novo.')
    }
  }

  const nomeDoJogador = (id) => jogadores.find((jogador) => jogador.id === id)?.nome

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Lançar meus gols"
        linha={`${pelada.nome} · ${nomeDoJogador(meuId) || 'você'}`}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
      />
      <div className="conteudo">
        {erro && <p className="erro">{erro}</p>}
        {recado && <p className="ajuda centro">{recado}</p>}

        {!jogo ? (
          <p className="ajuda">Você ainda não aparece na lista de nenhum dia de jogo.</p>
        ) : (
          <>
            <section className="cartao">
              <h2 className="titulo-secao">Qual dia</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {meus.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="botao botao--pequeno"
                    aria-pressed={item.id === jogo.id}
                    style={item.id === jogo.id ? { background: 'var(--tinta)', color: '#fff', border: 0 } : undefined}
                    onClick={() => {
                      definirEscolhido(item.id)
                      definirNumeros(null)
                    }}
                  >
                    {dataCurta(item.data)}
                  </button>
                ))}
              </div>
            </section>

            <section className="cartao">
              <h2 className="titulo-secao">{dataCurta(jogo.data)}</h2>
              <div className="linha">
                <span className="linha__nome">Gols</span>
                <Contador
                  valor={valores.gols}
                  aoMudar={(valor) => definirNumeros({ ...valores, gols: valor })}
                  rotulo="gol"
                  tamanho="grande"
                />
              </div>
              <div className="linha">
                <span className="linha__nome">Assistências</span>
                <Contador
                  valor={valores.assistencias}
                  aoMudar={(valor) => definirNumeros({ ...valores, assistencias: valor })}
                  rotulo="assistência"
                  tamanho="grande"
                />
              </div>
              <button type="button" className="botao botao--principal" onClick={enviar}>
                {pendente ? 'Atualizar o que enviei' : 'Enviar pra diretoria aprovar'}
              </button>
              <p className="ajuda centro">Só entra no ranking depois que a diretoria aprovar.</p>
            </section>

            {meusLancamentos.length > 0 && (
              <section className="cartao">
                <h2 className="titulo-secao">Meus lançamentos</h2>
                {meusLancamentos.slice(0, 8).map((item) => {
                  const dia = jogos.find((umJogo) => umJogo.id === item.jogoId)
                  return (
                    <div key={item.id} className="linha">
                      <span className="linha__nome">
                        {dia ? dataCurta(dia.data) : 'dia'}
                        <span className="lista__detalhe">
                          {' '}
                          · {item.gols || 0} gols · {item.assistencias || 0} assist.
                        </span>
                      </span>
                      <span
                        className={
                          item.situacao === 'aprovado'
                            ? 'chip chip--pago'
                            : item.situacao === 'recusado'
                              ? 'chip chip--deve'
                              : 'chip'
                        }
                        style={
                          item.situacao === 'aguardando'
                            ? { background: 'var(--areia)', color: 'var(--areia-tinta)' }
                            : undefined
                        }
                      >
                        {item.situacao}
                      </span>
                    </div>
                  )
                })}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
