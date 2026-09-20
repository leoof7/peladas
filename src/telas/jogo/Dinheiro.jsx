import Pix from '../../componentes/Pix.jsx'
import { agora } from '../../dados/api.js'
import { dividir, resultadoDoJogo, resumoDoDinheiroDoJogo } from '../../dados/regras.js'
import { dinheiro } from '../../util/formato.js'

// Passo 4: quem paga esse dia, quanto, e quem já pagou.
export default function Dinheiro({ pelada, jogo, jogadores, ehDiretoria, salvar, membro }) {
  const ehMensal = pelada.cobranca === 'mensal'
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const resumo = resumoDoDinheiroDoJogo(pelada, jogo, jogadores)
  const recebedores = pelada.config?.recebedores || []
  const indiceRecebedor = ehMensal
    ? Number(pelada.config?.recebeDomingo ?? 0)
    : Number(jogo.recebedor ?? pelada.config?.recebePelada ?? 0)
  const recebedor = recebedores[indiceRecebedor]
  const pagamentos = jogo.pagamentos || {}
  const meuJogadorId = membro?.jogadorId

  function marcar(jogadorId, pago) {
    salvar((atual) => ({
      pagamentos: { ...(atual.pagamentos || {}), [jogadorId]: { pago, em: agora() } },
    }))
  }

  function marcarTodos(pago) {
    salvar((atual) => {
      const novos = { ...(atual.pagamentos || {}) }
      for (const { jogadorId } of resumo.cobrancas) novos[jogadorId] = { pago, em: agora() }
      return { pagamentos: novos }
    })
  }

  if (jogo.status === 'cancelado') {
    return <p className="ajuda">Este dia está cancelado, então ninguém paga.</p>
  }

  if (resumo.quantidade === 0) {
    return (
      <p className="ajuda">
        {ehMensal
          ? 'Ninguém a cobrar ainda. Monte os times e ponha o placar: quem perder ou empatar aparece aqui.'
          : 'Ninguém a cobrar ainda. Marque quem chegou no primeiro passo.'}
      </p>
    )
  }

  const divisao = ehMensal ? null : dividir(Number(jogo.custo || 0), resumo.quantidade)

  return (
    <>
      <section className="cartao">
        {ehMensal ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>
                {resultadoDoJogo(jogo).empate
                  ? 'Empatou: os dois times pagam'
                  : `${jogo.times?.[resultadoDoJogo(jogo).devedores[0]]?.nome || 'O time que perdeu'} perdeu`}
              </span>
              <span className="lista__detalhe">{(jogo.placar || []).join(' × ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 40 }}>
                {dinheiro(resumo.total)}
              </span>
              <span className="lista__detalhe">
                {resumo.quantidade} × {dinheiro(pelada.config?.valorDerrota)} · goleiro isento não paga
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="campo">
              <label htmlFor="custo">Aluguel da quadra hoje (R$)</label>
              <input
                id="custo"
                inputMode="decimal"
                value={jogo.custo ?? ''}
                disabled={!ehDiretoria}
                onChange={(evento) => salvar({ custo: evento.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>Cada um paga</span>
              <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 40 }}>
                {dinheiro(divisao.porPessoa)}
              </span>
            </div>
            <p className="ajuda">
              {dinheiro(jogo.custo)} dividido por {resumo.quantidade} que jogaram, valor exato.
              {divisao.diferenca !== 0 &&
                ` Na soma dá ${dinheiro(Math.abs(divisao.diferenca))} de ${
                  divisao.diferenca > 0 ? 'sobra' : 'falta'
                } por causa dos centavos.`}
            </p>
          </>
        )}

        <div className="barra">
          <div
            className="barra__cheio"
            style={{ width: `${resumo.total ? Math.round((resumo.recebido / resumo.total) * 100) : 0}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: 'var(--ok)' }}>Recebido {dinheiro(resumo.recebido)}</span>
          <span style={{ color: 'var(--alerta)' }}>Falta {dinheiro(resumo.falta)}</span>
        </div>
      </section>

      {!ehMensal && ehDiretoria && recebedores.length > 1 && (
        <section className="cartao">
          <h2 className="titulo-secao">Quem recebe hoje</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recebedores.map((pessoa, indice) => (
              <button
                key={pessoa.nome + indice}
                type="button"
                className="botao botao--pequeno"
                aria-pressed={indice === indiceRecebedor}
                style={indice === indiceRecebedor ? { background: 'var(--tinta)', color: '#fff', border: 0 } : undefined}
                onClick={() => salvar({ recebedor: indice })}
              >
                {pessoa.nome}
              </button>
            ))}
          </div>
        </section>
      )}

      <Pix
        recebedor={recebedor}
        titulo={ehMensal ? 'Os R$ 2 vão para' : 'O rateio vai para'}
        valor={
          meuJogadorId && resumo.cobrancas.find((cobranca) => cobranca.jogadorId === meuJogadorId)
            ? `você paga ${dinheiro(
                resumo.cobrancas.find((cobranca) => cobranca.jogadorId === meuJogadorId).valor,
              )}`
            : ''
        }
      />

      {ehDiretoria && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="botao botao--contorno" style={{ flex: 1 }} onClick={() => marcarTodos(true)}>
            Todos pagaram
          </button>
          <button type="button" className="botao" style={{ flex: 1 }} onClick={() => marcarTodos(false)}>
            Desmarcar todos
          </button>
        </div>
      )}

      <section className="cartao">
        <h2 className="titulo-secao">Quem paga · {resumo.quantidade}</h2>
        {resumo.cobrancas.map(({ jogadorId, valor }) => {
          const pago = Boolean(pagamentos[jogadorId]?.pago)
          const souEu = jogadorId === meuJogadorId
          return (
            <div key={jogadorId} className="linha">
              {ehDiretoria ? (
                <input
                  type="checkbox"
                  checked={pago}
                  onChange={(evento) => marcar(jogadorId, evento.target.checked)}
                  aria-label={`${porId(jogadorId)?.nome} pagou`}
                  style={{ width: 22, height: 22 }}
                />
              ) : (
                <span aria-hidden="true" style={{ width: 22 }} />
              )}
              <span className="linha__nome">
                {porId(jogadorId)?.nome || 'Jogador'}
                {souEu && <span className="lista__detalhe"> · você</span>}
              </span>
              <span style={{ fontWeight: 700 }}>{dinheiro(valor)}</span>
              <span className={pago ? 'chip chip--pago' : 'chip chip--deve'}>{pago ? 'pago' : 'pendente'}</span>
            </div>
          )
        })}
        <p className="ajuda">
          O comprovante vai no grupo. A diretoria marca aqui quem pagou — o app não confirma sozinho.
        </p>
      </section>
    </>
  )
}
