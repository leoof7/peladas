import { useState } from 'react'
import { agora, gravar, novoId } from '../../dados/api.js'
import { casarNomes, lerNomesColados, presentes } from '../../dados/regras.js'
import { semAcento } from '../../util/formato.js'

// Passo 1: duas coisas diferentes na mesma tela.
// A LISTA é quem disse que vem (do grupo ou dos cadastrados).
// CHEGOU é quem apareceu de verdade, na ordem em que chegou.
export default function Chegada({ peladaId, pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const [busca, definirBusca] = useState('')
  const [colado, definirColado] = useState('')
  const [lidos, definirLidos] = useState(null)
  const [novoNome, definirNovoNome] = useState('')
  const [erro, definirErro] = useState('')

  const ehMensal = pelada.cobranca === 'mensal'
  const lista = jogo.lista || []
  const chegaram = presentes(jogo)
  const limite = ehMensal ? Number(pelada.config?.jogamPorDia || 22) : Number(pelada.config?.limiteVagas || 20)
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const nomeDe = (id) => porId(id)?.nome || 'Jogador'

  const naLista = lista.filter((jogadorId) => !chegaram.includes(jogadorId))
  const foraDaLista = jogadores
    .filter((jogador) => jogador.ativo !== false)
    .filter((jogador) => !lista.includes(jogador.id) && !chegaram.includes(jogador.id))
    .filter((jogador) => !busca.trim() || semAcento(jogador.nome).includes(semAcento(busca)))
    .sort((um, outro) => (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'))

  function porNaLista(jogadorId) {
    salvar((atual) => {
      const atualLista = atual.lista || []
      return atualLista.includes(jogadorId) ? {} : { lista: [...atualLista, jogadorId] }
    })
  }

  function tirarDaLista(jogadorId) {
    salvar((atual) => ({ lista: (atual.lista || []).filter((outro) => outro !== jogadorId) }))
  }

  function alternarChegada(jogadorId) {
    salvar((atual) => {
      const atuais = presentes(atual)
      return {
        chegaram: atuais.includes(jogadorId)
          ? atuais.filter((outro) => outro !== jogadorId)
          : [...atuais, jogadorId],
      }
    })
  }

  function trocarOrdem(indice, direcao) {
    salvar((atual) => {
      const nova = [...presentes(atual)]
      const destino = indice + direcao
      if (destino < 0 || destino >= nova.length) return {}
      ;[nova[indice], nova[destino]] = [nova[destino], nova[indice]]
      return { chegaram: nova }
    })
  }

  async function cadastrarConvidado(nome) {
    const jogadorId = novoId()
    await gravar(
      `peladas/${peladaId}/jogadores/${jogadorId}`,
      {
        nome: nome.trim(),
        apelido: '',
        posicao: 'meio',
        tipoJogador: 'convidado',
        isento: false,
        ativo: true,
        criadoEm: agora(),
      },
      { mesclar: false },
    )
    return jogadorId
  }

  async function adicionarConvidado() {
    if (novoNome.trim().length < 2) {
      definirErro('Escreva o nome do convidado.')
      return
    }
    try {
      const jogadorId = await cadastrarConvidado(novoNome)
      await salvar((atual) => ({
        lista: [...(atual.lista || []), jogadorId],
        chegaram: [...presentes(atual), jogadorId],
      }))
      definirNovoNome('')
      definirErro('')
    } catch {
      definirErro('Não consegui cadastrar. Só a diretoria pode.')
    }
  }

  function lerColado() {
    const nomes = lerNomesColados(colado)
    if (nomes.length === 0) {
      definirErro('Não achei nome nenhum nesse texto.')
      return
    }
    definirErro('')
    definirLidos(casarNomes(nomes, jogadores))
  }

  async function confirmarLidos() {
    try {
      const novos = []
      for (const item of lidos) novos.push(item.jogadorId || (await cadastrarConvidado(item.lido)))
      await salvar((atual) => {
        const nova = [...(atual.lista || [])]
        for (const jogadorId of novos) if (!nova.includes(jogadorId)) nova.push(jogadorId)
        return { lista: nova }
      })
      definirLidos(null)
      definirColado('')
      definirErro('')
    } catch {
      definirErro('Não consegui salvar a lista.')
    }
  }

  return (
    <>
      {erro && <p className="erro">{erro}</p>}

      <section className="cartao">
        <div className="numeros">
          <div className="numero">
            <span className="numero__valor">{lista.length}</span>
            <span className="numero__nome">na lista</span>
          </div>
          <div className="numero">
            <span className="numero__valor">{chegaram.length}</span>
            <span className="numero__nome">chegaram</span>
          </div>
          <div className="numero">
            <span className="numero__valor">{Math.max(0, chegaram.length - limite)}</span>
            <span className="numero__nome">{ehMensal ? 'de fora' : 'passaram das vagas'}</span>
          </div>
        </div>
        <p className="ajuda">
          A lista é quem disse que vem. Chegou é quem apareceu.{' '}
          {ehMensal
            ? `Os primeiros ${limite} que chegarem jogam; quem passar disso entra no 2º tempo.`
            : `A quadra tem ${limite} vagas.`}
        </p>
      </section>

      <section className="cartao">
        <h2 className="titulo-secao">Quem chegou · {chegaram.length}</h2>
        {chegaram.length === 0 ? (
          <p className="ajuda">Ninguém marcado como chegou ainda.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {chegaram.map((jogadorId, indice) => (
              <li key={jogadorId} className="linha">
                <span
                  style={{
                    width: 28,
                    fontFamily: 'var(--titulo)',
                    fontWeight: 800,
                    fontSize: 20,
                    textAlign: 'right',
                    color: indice < limite ? 'var(--tinta)' : 'var(--alerta)',
                  }}
                >
                  {indice + 1}
                </span>
                <span className="linha__nome">{nomeDe(jogadorId)}</span>
                {indice === limite && <span className="chip chip--neutro">2º tempo</span>}
                {ehDiretoria && (
                  <>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      aria-label={`Subir ${nomeDe(jogadorId)} na ordem de chegada`}
                      onClick={() => trocarOrdem(indice, -1)}
                      disabled={indice === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      aria-label={`Descer ${nomeDe(jogadorId)} na ordem de chegada`}
                      onClick={() => trocarOrdem(indice, 1)}
                      disabled={indice === chegaram.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      onClick={() => alternarChegada(jogadorId)}
                    >
                      Não veio
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="cartao">
        <h2 className="titulo-secao">Na lista, ainda não chegou · {naLista.length}</h2>
        {naLista.length === 0 ? (
          <p className="ajuda">
            {lista.length === 0 ? 'A lista está vazia.' : 'Todo mundo da lista já chegou.'}
          </p>
        ) : (
          naLista.map((jogadorId) => (
            <div key={jogadorId} className="linha">
              <span className="linha__nome">{nomeDe(jogadorId)}</span>
              {ehDiretoria && (
                <>
                  <button
                    type="button"
                    className="botao botao--pequeno"
                    style={{ background: 'var(--destaque)', color: '#fff', border: 0 }}
                    onClick={() => alternarChegada(jogadorId)}
                  >
                    Chegou
                  </button>
                  <button
                    type="button"
                    className="botao botao--pequeno"
                    aria-label={`Tirar ${nomeDe(jogadorId)} da lista`}
                    onClick={() => tirarDaLista(jogadorId)}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </section>

      {ehDiretoria && (
        <>
          <section className="cartao">
            <h2 className="titulo-secao">Montar a lista</h2>
            <p className="ajuda">Cole a lista do grupo ou puxe dos jogadores cadastrados.</p>
            <textarea
              id="colado"
              aria-label="Texto da lista do grupo"
              rows="4"
              value={colado}
              onChange={(evento) => definirColado(evento.target.value)}
              placeholder={'1- Leandro\n2- Wanderley\n3- Zé Luiz'}
              style={{
                border: '1px solid #d6d0c3',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 15,
                lineHeight: 1.45,
                resize: 'vertical',
              }}
            />
            <button type="button" className="botao" onClick={lerColado} disabled={!colado.trim()}>
              Ler os nomes
            </button>

            {lidos && (
              <>
                <p className="ajuda">Confira antes de pôr na lista:</p>
                {lidos.map((item, indice) => (
                  <div key={`${item.lido}-${indice}`} className="linha">
                    <span className="linha__nome">
                      {item.lido}
                      {item.jogadorId && nomeDe(item.jogadorId) !== item.lido && (
                        <span className="lista__detalhe"> → {nomeDe(item.jogadorId)}</span>
                      )}
                    </span>
                    <span className={item.jogadorId ? 'chip chip--pago' : 'chip chip--neutro'}>
                      {item.certeza === 'exato' ? 'cadastrado' : item.certeza === 'parecido' ? 'parecido' : 'novo'}
                    </span>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      onClick={() => definirLidos(lidos.filter((_, outro) => outro !== indice))}
                    >
                      Tirar
                    </button>
                  </div>
                ))}
                <button type="button" className="botao botao--principal" onClick={confirmarLidos}>
                  Pôr na lista
                </button>
              </>
            )}
          </section>

          <section className="cartao">
            <h2 className="titulo-secao">Puxar dos cadastrados</h2>
            <input
              aria-label="Buscar jogador"
              value={busca}
              onChange={(evento) => definirBusca(evento.target.value)}
              placeholder="Buscar pelo nome"
              style={{ height: 48, border: '1px solid #d6d0c3', borderRadius: 12, padding: '0 12px' }}
            />
            {foraDaLista.length === 0 ? (
              <p className="ajuda">Todo mundo já está na lista ou já chegou.</p>
            ) : (
              foraDaLista.slice(0, 30).map((jogador) => (
                <div key={jogador.id} className="linha">
                  <span className="linha__nome">{jogador.nome}</span>
                  <button
                    type="button"
                    className="botao botao--pequeno"
                    onClick={() => porNaLista(jogador.id)}
                  >
                    Pôr na lista
                  </button>
                  <button
                    type="button"
                    className="botao botao--pequeno"
                    style={{ background: 'var(--destaque)', color: '#fff', border: 0 }}
                    onClick={() => alternarChegada(jogador.id)}
                  >
                    Chegou
                  </button>
                </div>
              ))
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                aria-label="Nome do convidado"
                value={novoNome}
                onChange={(evento) => definirNovoNome(evento.target.value)}
                placeholder="Convidado de hoje"
                style={{
                  flexGrow: 1,
                  height: 48,
                  border: '1px solid #d6d0c3',
                  borderRadius: 12,
                  padding: '0 12px',
                }}
              />
              <button type="button" className="botao botao--contorno" onClick={adicionarConvidado}>
                Cadastrar e marcar
              </button>
            </div>
          </section>
        </>
      )}
    </>
  )
}
