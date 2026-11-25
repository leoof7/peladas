import { useState } from 'react'
import { dividirCampoPorChegada, dividirEmDois, montarTimes, montarTimesPorEstrelas, pesosDoSorteio, presentes } from '../../dados/regras.js'

const CURTO = { goleiro: 'GOL', defesa: 'DEF', meio: 'MEI', ataque: 'ATA' }

// Passo 2: os times. Na Madrugada sai na tampinha e o app só registra;
// na Shekinah o app sorteia (ou registra a tampinha também).
export default function Times({ pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const [previa, definirPrevia] = useState(null)
  const [gravando, definirGravando] = useState(false)
  const ehMensal = pelada.cobranca === 'mensal'
  const lista = [...new Set(presentes(jogo))]
  const assinatura = JSON.stringify([lista, jogo.times || []])
  const proposta = previa?.assinatura === assinatura ? previa.times : null
  const times = jogo.times || []
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const uniformes = pelada.config?.uniformes || []
  const porTime = Math.max(1, Math.floor(Number(pelada.config?.naLinhaPorTime) || (ehMensal ? 10 : 5)))
  const limiteCampo = Math.max(2, Math.floor(Number(pelada.config?.jogamPorDia) || (porTime + 1) * 2))

  const timeDe = (jogadorId) => times.findIndex((time) => (time.jogadores || []).includes(jogadorId))
  const semTime = lista.filter((jogadorId) => timeDe(jogadorId) === -1)

  function guardarTimes(novos) {
    definirPrevia(null)
    return salvar({ times: novos })
  }

  function porJogador(jogadorId, indiceDoTime) {
    salvar((atual) => ({
      times: (atual.times || []).map((time, indice) => ({
      ...time,
        jogadores: (time.jogadores || [])
          .filter((outro) => outro !== jogadorId)
          .concat(indice === indiceDoTime ? [jogadorId] : []),
      })),
    }))
  }

  function baseDosTimes() {
    if (times.length >= 2) return times
    const padrao = [
      { nome: uniformes[0]?.nome || 'Time 1', cor: uniformes[0]?.cor || '#1f4f8f', jogadores: [] },
      { nome: uniformes[1]?.nome || 'Time 2', cor: uniformes[1]?.cor || '#17191b', jogadores: [] },
    ]
    return padrao
  }

  function formatarGrupos(grupos, equilibrado = false) {
    return grupos.map((grupo, indice) => ({
      nome: indice >= (equilibrado ? 2 : 1) && indice === grupos.length - 1 && grupo.length < porTime ? 'De fora' : `Time ${indice + 1}`,
      cor: times[indice]?.cor || ['#17191b', '#1f4f8f', '#1e6b3c', '#9e3317'][indice % 4],
      jogadores: grupo,
    }))
  }

  function sugerirDivisao(modo) {
    if (lista.length < 2) return
    let novos
    if (ehMensal) {
      const base = baseDosTimes()
      const grupos = modo === 'chegada'
        ? dividirCampoPorChegada(lista, limiteCampo)
        : dividirEmDois(lista.slice(0, limiteCampo), jogadores)
      novos = grupos.map((grupo, indice) => ({ ...base[indice], jogadores: grupo }))
    } else {
      novos = modo === 'chegada'
        ? formatarGrupos(montarTimes(lista, porTime, 'ordem'))
        : formatarGrupos(montarTimesPorEstrelas(lista, porTime, jogadores), true)
    }
    definirPrevia({ assinatura, times: novos, modo })
  }

  async function salvarProposta() {
    if (!proposta || gravando) return
    definirGravando(true)
    try {
      if (await salvar({ times: proposta })) definirPrevia(null)
    } finally {
      definirGravando(false)
    }
  }

  const escalados = proposta?.filter((time) => time.nome !== 'De fora') || []
  const pesos = pesosDoSorteio(escalados.flatMap((time) => time.jogadores), jogadores)
  const total = (time) => time.jogadores.reduce((soma, id) => soma + (pesos.get(id)?.peso ?? 0), 0) / 2
  const totais = escalados.map(total)
  const semNota = escalados.flatMap((time) => time.jogadores).filter((id) => !porId(id)?.estrelas).length

  function trocarUniforme(indice, uniforme) {
    guardarTimes(times.map((time, outro) => (outro === indice ? { ...time, ...uniforme } : time)))
  }

  function contarPosicoes(time) {
    const contagem = { goleiro: 0, defesa: 0, meio: 0, ataque: 0 }
    for (const jogadorId of time.jogadores || []) {
      const posicao = porId(jogadorId)?.posicao
      if (posicao in contagem) contagem[posicao] += 1
    }
    return contagem
  }

  if (lista.length === 0) {
    return <p className="ajuda">Antes marque quem chegou, no primeiro passo.</p>
  }

  return (
    <>
      {ehDiretoria && (
        <section className="cartao">
          <h2 className="titulo-secao">Montar os times</h2>
          <p className="ajuda">
            {lista.length} chegaram. O sorteio aproxima a soma das estrelas e distribui os goleiros entre os times.
            {ehMensal && ' A tampinha continua disponível para montar os times à mão.'}
          </p>
          <div className="acoes-times">
            <button type="button" className="botao botao--principal" onClick={() => sugerirDivisao('estrelas')} disabled={lista.length < 2 || gravando}>
              Por estrelas
            </button>
            <button type="button" className="botao" disabled={lista.length < 2 || gravando} onClick={() => sugerirDivisao('chegada')}>
              Por ordem de chegada
            </button>
            {ehMensal && <button type="button" className="botao" disabled={gravando} onClick={() => {
              definirPrevia(null)
              if (times.length < 2) guardarTimes(baseDosTimes())
            }}>Montar à mão</button>}
          </div>
          {previa && !proposta && !gravando && <p className="ajuda">A chegada ou os times mudaram. Tire os times de novo.</p>}

        </section>
      )}

      {ehDiretoria && proposta && (
        <section className="cartao" aria-live="polite">
          <h2 className="titulo-secao">Confira antes de salvar</h2>
          <p className="ajuda">{previa.modo === 'chegada' ? 'Por ordem de chegada' : 'Por estrelas'}</p>
          {ehMensal && lista.length > limiteCampo && <p className="ajuda">Quem chegou depois dos {limiteCampo} primeiros fica sem time para o segundo tempo.</p>}
          {totais.length > 1 && <p className="ajuda">Diferença: {(Math.max(...totais) - Math.min(...totais)).toLocaleString('pt-BR')} ★</p>}
          {previa.modo === 'estrelas' && semNota > 0 && <p className="ajuda">{totais.some(Boolean) ? "Quem está sem nota entra com a média do grupo só para o sorteio." : "Ainda não há notas. Os times foram divididos por quantidade e goleiros."}</p>}
          <div className="comparar-times">
          {proposta.map((time, indice) => (
            <div className="time-proposto" key={indice}>
              <strong>{time.nome} · {time.jogadores.length} {time.nome !== 'De fora' && `· ${total(time).toLocaleString('pt-BR')} ★`}</strong>
              <ul>{time.jogadores.map((id) => <li key={id}>{porId(id)?.apelido || porId(id)?.nome || 'Jogador'}{porId(id)?.posicao === 'goleiro' ? ' · Goleiro' : ''}</li>)}</ul>
            </div>
          ))}
          </div>
          <div className="acoes-times">
            <button type="button" className="botao" disabled={gravando} onClick={() => definirPrevia(null)}>Descartar</button>
            <button type="button" className="botao botao--principal" disabled={gravando} onClick={salvarProposta}>{gravando ? 'Salvando…' : 'Salvar times'}</button>
          </div>
        </section>
      )}

      {!proposta && times.map((time, indice) => {
        const contagem = contarPosicoes(time)
        return (
          <section className="cartao" key={`${time.nome}-${indice}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: time.cor || '#17191b',
                  border: '2px solid var(--linha)',
                  flexShrink: 0,
                }}
              />
              <h2 className="titulo-secao" style={{ flexGrow: 1 }}>
                {time.nome} · {(time.jogadores || []).length}
              </h2>
              <span className="lista__detalhe">
                {contagem.goleiro} GOL · {contagem.defesa} DEF · {contagem.meio} MEI · {contagem.ataque} ATA
              </span>
            </div>

            {ehMensal && ehDiretoria && uniformes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {uniformes.map((uniforme) => (
                  <button
                    key={uniforme.nome}
                    type="button"
                    className="botao botao--pequeno"
                    aria-pressed={time.nome === uniforme.nome}
                    style={
                      time.nome === uniforme.nome
                        ? { background: 'var(--tinta)', color: '#fff', border: 0 }
                        : undefined
                    }
                    onClick={() => trocarUniforme(indice, uniforme)}
                  >
                    {uniforme.nome}
                  </button>
                ))}
              </div>
            )}

            {(time.jogadores || []).length === 0 ? (
              <p className="ajuda">Ninguém neste time ainda.</p>
            ) : (
              (time.jogadores || []).map((jogadorId) => (
                <div key={jogadorId} className="linha">
                  <span className="linha__nome">{porId(jogadorId)?.nome || 'Jogador'}</span>
                  <span className="selo selo--posicao">{CURTO[porId(jogadorId)?.posicao] || '—'}</span>
                  {ehDiretoria && (
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      onClick={() => porJogador(jogadorId, -1)}
                    >
                      Tirar
                    </button>
                  )}
                </div>
              ))
            )}
          </section>
        )
      })}

      {ehDiretoria && !proposta && times.length > 0 && semTime.length > 0 && (
        <section className="cartao">
          <h2 className="titulo-secao">Ainda sem time · {semTime.length}</h2>
          <p className="ajuda">Toque no time de cada um.</p>
          {semTime.map((jogadorId, posicaoNaLista) => (
            <div key={jogadorId} className="linha">
              <span className="linha__nome">
                {porId(jogadorId)?.nome || 'Jogador'}
                {ehMensal && lista.indexOf(jogadorId) >= Number(pelada.config?.jogamPorDia || 22) && (
                  <span className="lista__detalhe"> · entra no 2º tempo</span>
                )}
              </span>
              {!proposta && times.map((time, indice) => (
                <button
                  key={`${jogadorId}-${indice}`}
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() => porJogador(jogadorId, indice)}
                  data-posicao={posicaoNaLista}
                >
                  {time.nome}
                </button>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
