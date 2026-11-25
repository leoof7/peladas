import { useState } from 'react'
import Avatar from '../../componentes/Avatar.jsx'
import { notaEmNumero } from '../../dados/estrelas.js'

// A soma de um time passa de 5, então não dá pra usar a conta da nota de um
// jogador, que para em 5. Aqui é só o número com vírgula.
const emNumero = (valor) => Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
import {
  dividirCampoPorChegada,
  pesosDoSorteio,
  presentes,
  separarGoleiros,
  sortearTimes,
} from '../../dados/regras.js'

const CURTO = { goleiro: 'GOL', defesa: 'DEF', meio: 'MEI', ataque: 'ATA' }
const CORES = ['#11141a', '#1b4fd0']

// Fica fora da tela de propósito: componente criado dentro do render vira um
// componente novo a cada desenho e o React remonta tudo sem necessidade.
function Peca({ jogador, nome, estrela, escolhida, podeMexer, aoTocar }) {
  return (
    <button
      type="button"
      className={`peca${escolhida ? ' peca--escolhida' : ''}`}
      onClick={aoTocar}
      disabled={!podeMexer}
    >
      <Avatar nome={jogador?.nome} foto={jogador?.foto} tamanho="mini" />
      <span className="peca__nome">{nome}</span>
      <span className="peca__estrela">{estrela ? notaEmNumero(estrela) : '–'}</span>
    </button>
  )
}

// Passo 2: os times. O goleiro nunca entra no sorteio — ele fica à parte e a
// diretoria diz pra qual time vai. O sorteio mexe só com quem joga na linha.
export default function Times({ pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const [previa, definirPrevia] = useState(null)
  const [escolhido, definirEscolhido] = useState(null)
  const [gravando, definirGravando] = useState(false)

  const ehMensal = pelada.cobranca === 'mensal'
  const chegaram = [...new Set(presentes(jogo))]
  const assinatura = JSON.stringify(chegaram)
  const uniformes = pelada.config?.uniformes || []
  const porTime = Math.max(1, Math.floor(Number(pelada.config?.naLinhaPorTime) || (ehMensal ? 10 : 5)))

  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const nomeCurto = (id) => porId(id)?.apelido || porId(id)?.nome || 'Jogador'
  const { goleiros } = separarGoleiros(chegaram, jogadores)

  const salvos = jogo.times || []
  const vale = previa && previa.assinatura === assinatura
  const emTela = vale ? previa : lerDoSalvo()
  const pesos = pesosDoSorteio(chegaram, jogadores)
  const estrelasDe = (id) => (pesos.get(id)?.peso ?? 0) / 2
  const somaDe = (ids) => ids.reduce((total, id) => total + estrelasDe(id), 0)

  // Os times salvos viram o mesmo formato da prévia, pra tela ser uma só.
  function lerDoSalvo() {
    if (salvos.length < 2) return null
    const linhas = salvos.map((time) =>
      (time.jogadores || []).filter((id) => !goleiros.includes(id)),
    )
    const donos = {}
    salvos.forEach((time, indice) => {
      for (const id of time.jogadores || []) if (goleiros.includes(id)) donos[id] = indice
    })
    const dentro = salvos.flatMap((time) => time.jogadores || [])
    return {
      assinatura,
      times: linhas,
      goleiros: donos,
      fora: chegaram.filter((id) => !dentro.includes(id) && !goleiros.includes(id)),
      salvo: true,
    }
  }

  function tirar() {
    const resultado = sortearTimes(chegaram, jogadores, { porTime })
    const donos = {}
    resultado.goleiros.forEach((id, indice) => {
      donos[id] = indice < 2 ? indice : null
    })
    definirEscolhido(null)
    definirPrevia({ assinatura, times: resultado.times, goleiros: donos, fora: resultado.fora })
  }

  function porChegada() {
    const { linha } = separarGoleiros(chegaram, jogadores)
    const [um, outro] = dividirCampoPorChegada(linha, porTime * 2)
    const donos = {}
    goleiros.forEach((id, indice) => {
      donos[id] = indice < 2 ? indice : null
    })
    definirEscolhido(null)
    definirPrevia({
      assinatura,
      times: [um, outro],
      goleiros: donos,
      fora: linha.slice(porTime * 2),
    })
  }

  function mexer(mudar) {
    definirPrevia((atual) => {
      const base = atual && atual.assinatura === assinatura ? atual : lerDoSalvo()
      if (!base) return atual
      return { ...mudar(base), assinatura, salvo: false }
    })
  }

  function mandarGoleiro(jogadorId, destino) {
    mexer((base) => ({ ...base, goleiros: { ...base.goleiros, [jogadorId]: destino } }))
  }

  // Tocar num jogador o escolhe; tocar em outro de outro lado troca os dois.
  // Assim os times nunca ficam com tamanhos diferentes.
  function tocar(jogadorId, ondeEsta) {
    if (!ehDiretoria) return
    if (!escolhido) {
      definirEscolhido({ id: jogadorId, onde: ondeEsta })
      return
    }
    if (escolhido.id === jogadorId) {
      definirEscolhido(null)
      return
    }
    if (escolhido.onde === ondeEsta) {
      definirEscolhido({ id: jogadorId, onde: ondeEsta })
      return
    }
    const um = escolhido
    definirEscolhido(null)
    mexer((base) => {
      const trocar = (lista) =>
        lista.map((id) => (id === um.id ? jogadorId : id === jogadorId ? um.id : id))
      return {
        ...base,
        times: base.times.map(trocar),
        fora: trocar(base.fora),
      }
    })
  }

  async function guardar() {
    if (!emTela || gravando) return
    definirGravando(true)
    try {
      const montados = emTela.times.map((linha, indice) => ({
        nome: salvos[indice]?.nome || uniformes[indice]?.nome || `Time ${indice + 1}`,
        cor: salvos[indice]?.cor || uniformes[indice]?.cor || CORES[indice],
        jogadores: [
          ...Object.entries(emTela.goleiros)
            .filter(([, destino]) => destino === indice)
            .map(([id]) => id),
          ...linha,
        ],
      }))
      if (await salvar({ times: montados })) definirPrevia(null)
    } finally {
      definirGravando(false)
    }
  }

  function trocarUniforme(indice, uniforme) {
    salvar({ times: salvos.map((time, outro) => (outro === indice ? { ...time, ...uniforme } : time)) })
  }

  if (chegaram.length === 0) {
    return <p className="ajuda">Antes marque quem chegou, no primeiro passo.</p>
  }

  const somas = emTela ? emTela.times.map(somaDe) : []
  const diferenca = somas.length === 2 ? Math.abs(somas[0] - somas[1]) : 0
  const naoTemNota = chegaram.filter((id) => !porId(id)?.estrelas).length

  const peca = (id, onde) => (
    <Peca
      key={id}
      jogador={porId(id)}
      nome={nomeCurto(id)}
      estrela={estrelasDe(id)}
      escolhida={escolhido?.id === id}
      podeMexer={ehDiretoria}
      aoTocar={() => tocar(id, onde)}
    />
  )

  return (
    <>
      {ehDiretoria && (
        <section className="sorteio">
          <p className="sorteio__titulo">
            {emTela?.salvo ? 'Times salvos' : 'Sorteio pelas estrelas'} · {chegaram.length} chegaram
          </p>
          {emTela && somas.length === 2 ? (
            <div className="duelo">
              <div className="duelo__time">
                <span className="duelo__nome">{salvos[0]?.nome || uniformes[0]?.nome || 'Time 1'}</span>
                <span className="duelo__soma">{emNumero(somas[0])}</span>
                <span className="duelo__quanto">{emTela.times[0].length} na linha</span>
              </div>
              <div className="duelo__meio">
                <span className="duelo__rotulo">diferença</span>
                <span className={`duelo__dif${diferenca <= 0.5 ? ' duelo__dif--ok' : ''}`}>
                  {emNumero(diferenca)}
                </span>
              </div>
              <div className="duelo__time">
                <span className="duelo__nome">{salvos[1]?.nome || uniformes[1]?.nome || 'Time 2'}</span>
                <span className="duelo__soma">{emNumero(somas[1])}</span>
                <span className="duelo__quanto">{emTela.times[1].length} na linha</span>
              </div>
            </div>
          ) : (
            <p className="sorteio__ajuda">
              O goleiro fica de fora do sorteio. Só a linha é dividida, somando as estrelas dos
              dois lados.
            </p>
          )}
          <div className="sorteio__botoes">
            <button type="button" className="botao botao--claro" onClick={tirar} disabled={gravando}>
              🎲 {emTela ? 'Tirar de novo' : 'Tirar os times'}
            </button>
            <button type="button" className="botao botao--fantasma" onClick={porChegada} disabled={gravando}>
              Por chegada
            </button>
          </div>
          {naoTemNota > 0 && (
            <p className="sorteio__ajuda">
              {naoTemNota} sem nota {naoTemNota === 1 ? 'entra' : 'entram'} com a média do grupo.
            </p>
          )}
        </section>
      )}

      {goleiros.length > 0 && emTela && (
        <section className="cartao cartao--goleiros">
          <h2 className="titulo-secao">Goleiros · {goleiros.length}</h2>
          <p className="ajuda">Fora do sorteio. Você escolhe o time de cada um.</p>
          {goleiros.map((id) => (
            <div key={id} className="gol-linha">
              <Avatar nome={porId(id)?.nome} foto={porId(id)?.foto} tamanho="mini" />
              <span className="gol-linha__nome">{porId(id)?.nome}</span>
              <div className="gol-linha__opcoes">
                {[0, 1].map((indice) => (
                  <button
                    key={indice}
                    type="button"
                    className={`op${emTela.goleiros[id] === indice ? ' op--marcada' : ''}`}
                    style={
                      emTela.goleiros[id] === indice
                        ? { background: salvos[indice]?.cor || CORES[indice], borderColor: salvos[indice]?.cor || CORES[indice] }
                        : undefined
                    }
                    onClick={() => mandarGoleiro(id, indice)}
                    disabled={!ehDiretoria}
                  >
                    {salvos[indice]?.nome || uniformes[indice]?.nome || `Time ${indice + 1}`}
                  </button>
                ))}
                <button
                  type="button"
                  className={`op${emTela.goleiros[id] == null ? ' op--marcada' : ''}`}
                  onClick={() => mandarGoleiro(id, null)}
                  disabled={!ehDiretoria}
                >
                  Fora
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {emTela && (
        <>
          {ehDiretoria && (
            <p className="ajuda centro">
              {escolhido
                ? `${nomeCurto(escolhido.id)} escolhido — toque em alguém do outro lado pra trocar.`
                : 'Toque em dois jogadores de lados diferentes pra trocar.'}
            </p>
          )}
          <div className="tabuleiro">
            {emTela.times.map((linha, indice) => (
              <section className="coluna-time" key={indice}>
                <header style={{ background: salvos[indice]?.cor || uniformes[indice]?.cor || CORES[indice] }}>
                  <span>{salvos[indice]?.nome || uniformes[indice]?.nome || `Time ${indice + 1}`}</span>
                  <span>{emNumero(somas[indice])}★</span>
                </header>
                <div className="coluna-time__corpo">
                  {Object.entries(emTela.goleiros)
                    .filter(([, destino]) => destino === indice)
                    .map(([id]) => (
                      <div key={id} className="peca peca--goleiro">
                        <Avatar nome={porId(id)?.nome} foto={porId(id)?.foto} tamanho="mini" />
                        <span className="peca__nome">{nomeCurto(id)}</span>
                        <span className="peca__estrela">GOL</span>
                      </div>
                    ))}
                  {linha.length === 0 ? (
                    <p className="ajuda">Ninguém ainda.</p>
                  ) : (
                    linha.map((id) => peca(id, `time${indice}`))
                  )}
                </div>
              </section>
            ))}
          </div>

          {emTela.fora.length > 0 && (
            <section className="cartao cartao--fora">
              <h2 className="titulo-secao">
                De fora · {emTela.fora.length}
                <span className="lista__detalhe">
                  {ehMensal ? ' entram no 2º tempo' : ' entram no rodízio'}
                </span>
              </h2>
              <div className="fora-pecas">
                {emTela.fora.map((id) => peca(id, 'fora'))}
              </div>
            </section>
          )}

          {ehDiretoria && (
            <div className="fileira-de-botoes">
              <button
                type="button"
                className="botao botao--principal"
                onClick={guardar}
                disabled={gravando || Boolean(emTela.salvo)}
              >
                {gravando ? 'Salvando…' : emTela.salvo ? 'Times salvos ✓' : 'Salvar times'}
              </button>
              {!emTela.salvo && salvos.length > 0 && (
                <button type="button" className="botao" onClick={() => definirPrevia(null)}>
                  Descartar e voltar aos salvos
                </button>
              )}
            </div>
          )}
        </>
      )}

      {ehMensal && ehDiretoria && uniformes.length > 0 && salvos.length > 0 && (
        <section className="cartao">
          <h2 className="titulo-secao">Uniformes do dia</h2>
          {salvos.map((time, indice) => (
            <div key={indice} className="linha">
              <span className="linha__nome">{time.nome}</span>
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
            </div>
          ))}
        </section>
      )}

      {!emTela && !ehDiretoria && <p className="ajuda">Os times ainda não foram tirados.</p>}

      {emTela?.salvo && (
        <p className="ajuda centro">
          {CURTO.goleiro} {goleiros.length} · {chegaram.length} chegaram ·{' '}
          {emTela.fora.length} de fora
        </p>
      )}
    </>
  )
}
