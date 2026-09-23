import Contador from '../../componentes/Contador.jsx'
import { agora, gravar } from '../../dados/api.js'
import { presentes, resultadoDoJogo } from '../../dados/regras.js'

// Passo 3: placar, gols e assistências. Também é aqui que a diretoria aprova
// o que os jogadores lançaram no celular deles.
export default function Gols({ peladaId, pelada, jogo, jogadores, ehDiretoria, salvar, lancamentos }) {
  const ehMensal = pelada.cobranca === 'mensal'
  const lista = presentes(jogo)
  const times = jogo.times || []
  const gols = jogo.gols || {}
  const assistencias = jogo.assistencias || {}
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)

  const aguardando = lancamentos.filter(
    (lancamento) => lancamento.jogoId === jogo.id && lancamento.situacao === 'aguardando',
  )

  const placar = jogo.placar || [0, 0]
  const somaDosGols = Object.values(gols).reduce((total, valor) => total + Number(valor || 0), 0)
  const somaDoPlacar = placar.reduce((total, valor) => total + Number(valor || 0), 0)

  function mudarPlacar(indice, valor) {
    salvar((atual) => {
      const novo = [...(atual.placar || [0, 0])]
      novo[indice] = valor
      return { placar: novo }
    })
  }

  function mudarNumero(campo, jogadorId, valor) {
    salvar((atual) => ({ [campo]: { ...(atual[campo] || {}), [jogadorId]: valor } }))
  }

  async function responder(lancamento, aprovado) {
    if (aprovado) {
      await salvar((atual) => ({
        gols: { ...(atual.gols || {}), [lancamento.jogadorId]: Number(lancamento.gols || 0) },
        assistencias: {
          ...(atual.assistencias || {}),
          [lancamento.jogadorId]: Number(lancamento.assistencias || 0),
        },
      }))
    }
    await gravar(`peladas/${peladaId}/lancamentos/${lancamento.id}`, {
      situacao: aprovado ? 'aprovado' : 'recusado',
      respondidoEm: agora(),
    })
  }

  async function aprovarTodos() {
    for (const lancamento of aguardando) await responder(lancamento, true)
  }

  if (lista.length === 0) {
    return <p className="ajuda">Primeiro marque quem chegou.</p>
  }

  return (
    <>
      {ehMensal && (
        <section className="cartao">
          <h2 className="titulo-secao">Placar</h2>
          {times.length < 2 ? (
            <p className="ajuda">Monte os dois times no passo anterior.</p>
          ) : (
            <>
              <div className="placar">
                <span className="placar__time">{times[0].nome}</span>
                <span className="lista__detalhe">×</span>
                <span className="placar__time">{times[1].nome}</span>
                <Contador
                  valor={Number(placar[0] || 0)}
                  aoMudar={(valor) => mudarPlacar(0, valor)}
                  rotulo={`gol do ${times[0].nome}`}
                  tamanho="grande"
                  desligado={!ehDiretoria}
                />
                <span />
                <Contador
                  valor={Number(placar[1] || 0)}
                  aoMudar={(valor) => mudarPlacar(1, valor)}
                  rotulo={`gol do ${times[1].nome}`}
                  tamanho="grande"
                  desligado={!ehDiretoria}
                />
              </div>
              <p className={somaDosGols === somaDoPlacar ? 'ajuda centro' : 'erro'}>
                {somaDosGols === somaDoPlacar
                  ? `A soma dos gols bate com o placar (${somaDosGols}).`
                  : `Os jogadores somam ${somaDosGols} gols e o placar tem ${somaDoPlacar}. Pode ser gol contra, ou falta lançar.`}
              </p>
              <p className="ajuda centro">
                {resultadoDoJogo(jogo).empate
                  ? 'Empate: os dois times pagam.'
                  : `${times[resultadoDoJogo(jogo).vencedor].nome} venceu. ${
                      times[resultadoDoJogo(jogo).devedores[0]].nome
                    } paga.`}
              </p>
            </>
          )}
        </section>
      )}

      {ehDiretoria && aguardando.length > 0 && (
        <section className="cartao" style={{ borderColor: '#c99a2e', borderWidth: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="titulo-secao">Lançados pelos jogadores</h2>
            <span className="chip" style={{ background: 'var(--areia)', color: 'var(--areia-tinta)' }}>
              {aguardando.length} aguardando
            </span>
          </div>
          <p className="ajuda">Aprovar troca o número do jogador no dia pelo que ele lançou.</p>
          {aguardando.map((lancamento) => (
            <div key={lancamento.id} className="linha">
              <span className="linha__nome">
                {porId(lancamento.jogadorId)?.nome || 'Jogador'}
                <span className="lista__detalhe">
                  {' '}
                  · {lancamento.gols || 0} gols · {lancamento.assistencias || 0} assist.
                </span>
              </span>
              <button type="button" className="botao botao--pequeno" onClick={() => responder(lancamento, false)}>
                Recusar
              </button>
              <button
                type="button"
                className="botao botao--pequeno"
                style={{ background: 'var(--destaque)', color: '#fff', border: 0 }}
                onClick={() => responder(lancamento, true)}
              >
                Aprovar
              </button>
            </div>
          ))}
          <button type="button" className="botao botao--contorno" onClick={aprovarTodos}>
            Aprovar todos
          </button>
        </section>
      )}

      <section className="cartao">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="titulo-secao" style={{ flexGrow: 1 }}>
            Gols e assistências
          </h2>
          <span className="lista__detalhe" style={{ width: 96, textAlign: 'center' }}>
            Gols
          </span>
          <span className="lista__detalhe" style={{ width: 96, textAlign: 'center' }}>
            Assist.
          </span>
        </div>
        {lista.map((jogadorId) => (
          <div key={jogadorId} className="linha">
            <span className="linha__nome">{porId(jogadorId)?.nome || 'Jogador'}</span>
            <Contador
              valor={Number(gols[jogadorId] || 0)}
              aoMudar={(valor) => mudarNumero('gols', jogadorId, valor)}
              rotulo={`gol de ${porId(jogadorId)?.nome || 'jogador'}`}
              desligado={!ehDiretoria}
            />
            <Contador
              valor={Number(assistencias[jogadorId] || 0)}
              aoMudar={(valor) => mudarNumero('assistencias', jogadorId, valor)}
              rotulo={`assistência de ${porId(jogadorId)?.nome || 'jogador'}`}
              desligado={!ehDiretoria}
            />
          </div>
        ))}
        {!ehDiretoria && (
          <p className="ajuda">
            Só a diretoria muda esses números aqui. Pra lançar os seus, use "Lançar meus gols" na tela inicial.
          </p>
        )}
      </section>
    </>
  )
}
