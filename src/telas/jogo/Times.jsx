import { dividirEmDois, montarTimes, presentes } from '../../dados/regras.js'

const CURTO = { goleiro: 'GOL', defesa: 'DEF', meio: 'MEI', ataque: 'ATA' }

// Passo 2: os times. Na Madrugada sai na tampinha e o app só registra;
// na Shekinah o app sorteia (ou registra a tampinha também).
export default function Times({ pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const ehMensal = pelada.cobranca === 'mensal'
  const lista = presentes(jogo)
  const times = jogo.times || []
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const uniformes = pelada.config?.uniformes || []
  const porTime = Number(pelada.config?.naLinhaPorTime || (ehMensal ? 11 : 5))

  const timeDe = (jogadorId) => times.findIndex((time) => (time.jogadores || []).includes(jogadorId))
  const semTime = lista.filter((jogadorId) => timeDe(jogadorId) === -1)

  function guardarTimes(novos) {
    salvar({ times: novos })
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

  function garantirDoisTimes() {
    if (times.length >= 2) return times
    const padrao = [
      { nome: uniformes[0]?.nome || 'Time 1', cor: uniformes[0]?.cor || '#1f4f8f', jogadores: [] },
      { nome: uniformes[1]?.nome || 'Time 2', cor: uniformes[1]?.cor || '#17191b', jogadores: [] },
    ]
    guardarTimes(padrao)
    return padrao
  }

  function sugerirDivisao() {
    const base = garantirDoisTimes()
    const [um, outro] = dividirEmDois(lista.slice(0, porTime * 2), jogadores)
    guardarTimes([
      { ...base[0], jogadores: um },
      { ...base[1], jogadores: outro },
    ])
  }

  function sortearShekinah(modo) {
    const grupos = montarTimes(lista, porTime, modo)
    guardarTimes(
      grupos.map((grupo, indice) => ({
        // O último grupo só vira "De fora" quando ficou incompleto e existe
        // pelo menos um time cheio antes dele.
        nome:
          indice > 0 && indice === grupos.length - 1 && grupo.length < porTime
            ? 'De fora'
            : `Time ${indice + 1}`,
        cor: ['#17191b', '#1f4f8f', '#1e6b3c', '#9e3317'][indice % 4],
        jogadores: grupo,
      })),
    )
  }

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
          {ehMensal ? (
            <>
              <p className="ajuda">
                Os times saem na tampinha, ao vivo. Aqui você só registra quem ficou em cada um. Se quiser, o
                app sugere uma divisão equilibrada por posição.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="botao" style={{ flex: 1 }} onClick={garantirDoisTimes}>
                  Começar os dois times
                </button>
                <button type="button" className="botao" style={{ flex: 1 }} onClick={sugerirDivisao}>
                  Sugerir divisão
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="ajuda">
                {lista.length} na quadra · {porTime} na linha por time.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="botao botao--principal"
                  style={{ flex: 1 }}
                  onClick={() => sortearShekinah('aleatorio')}
                >
                  Sortear
                </button>
                <button type="button" className="botao" style={{ flex: 1 }} onClick={() => sortearShekinah('ordem')}>
                  Ordem de chegada
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {times.map((time, indice) => {
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

      {ehDiretoria && times.length > 0 && semTime.length > 0 && (
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
              {times.map((time, indice) => (
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
