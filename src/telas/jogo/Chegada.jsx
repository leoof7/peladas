import { useState } from 'react'
import { agora, novoId } from '../../dados/api.js'
import { casarNomes, chaveNome, lerNomesColados, presentes } from '../../dados/regras.js'
import { semAcento } from '../../util/formato.js'

// Passo 1: duas coisas diferentes na mesma tela.
// A LISTA é quem disse que vem (do grupo ou dos cadastrados).
// CHEGOU é quem apareceu de verdade, na ordem em que chegou.
export default function Chegada({ peladaId, pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const [busca, definirBusca] = useState('')
  const [colado, definirColado] = useState('')
  const [lidos, definirLidos] = useState(null)
  const [importando, definirImportando] = useState(false)
  const [novoNome, definirNovoNome] = useState('')
  const [erro, definirErro] = useState('')

  const ehMensal = pelada.cobranca === 'mensal'
  const lista = jogo.lista || []
  const chegaram = presentes(jogo)
  const limite = ehMensal ? Number(pelada.config?.jogamPorDia || 22) : Number(pelada.config?.limiteVagas || 20)
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)
  const nomeDe = (id) => porId(id)?.nome || 'Jogador'

  const naLista = lista.filter((jogadorId) => !chegaram.includes(jogadorId))
  const cadastrados = jogadores.filter((jogador) => jogador.ativo !== false).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const foraDaLista = cadastrados
    .filter((jogador) => !lista.includes(jogador.id) && !chegaram.includes(jogador.id))
    .filter((jogador) => !busca.trim() || [jogador.nome, jogador.apelido].some((nome) => semAcento(nome).includes(semAcento(busca))))
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

  function novoConvidado(nome) {
    const id = novoId()
    return { id, item: {
      caminho: `peladas/${peladaId}/jogadores/${id}`,
      dados: { nome: nome.trim(), apelido: '', posicao: 'meio', tipoJogador: 'convidado', isento: false, ativo: true, criadoEm: agora() },
      mesclar: false,
    } }
  }

  async function adicionarConvidado() {
    if (novoNome.trim().length < 2) {
      definirErro('Escreva o nome do convidado.')
      return
    }
    try {
      const { id: jogadorId, item } = novoConvidado(novoNome)
      if (!await salvar((atual) => ({
        lista: [...(atual.lista || []), jogadorId],
        chegaram: [...presentes(atual), jogadorId],
      }), [item])) return
      definirNovoNome('')
      definirErro('')
    } catch {
      definirErro('Não consegui cadastrar. Só a diretoria pode.')
    }
  }

  function lerColado() {
    const nomes = [...new Map(lerNomesColados(colado).filter((nome) => chaveNome(nome).length >= 2).map((nome) => [chaveNome(nome), nome])).values()]
    if (nomes.length === 0) {
      definirErro('Não achei nome nenhum nesse texto.')
      return
    }
    definirErro('')
    definirLidos(casarNomes(nomes, jogadores).map((item) => ({ ...item, escolha: item.jogadorId || '' })))
  }

  async function confirmarLidos() {
    if (importando || !lidos?.some((item) => item.escolha)) return
    definirImportando(true)
    try {
      const ids = new Set()
      const novos = []
      const criados = new Set()
      for (const item of lidos) {
        if (item.escolha === '@novo') {
          const chave = chaveNome(item.lido)
          const existente = jogadores.find((j) => chaveNome(j.nome) === chave)
          if (existente) {
            if (existente.ativo === false) {
              definirErro(`${existente.nome} está inativo. Reative o cadastro antes de usar esse nome.`)
              return
            }
            ids.add(existente.id)
          } else if (!criados.has(chave)) {
            const novo = novoConvidado(item.lido)
            criados.add(chave)
            ids.add(novo.id)
            novos.push(novo.item)
          }
        } else if (item.escolha && cadastrados.some((j) => j.id === item.escolha)) {
          ids.add(item.escolha)
        }
      }
      if (!ids.size) return
      if (await salvar((atual) => ({ lista: [...new Set([...(atual.lista || []), ...ids])] }), novos)) {
        definirLidos(null)
        definirColado('')
        definirErro('')
      }
    } finally {
      definirImportando(false)
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
                {ehMensal && indice === limite && <span className="chip chip--neutro">2º tempo</span>}
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
            <h2 className="titulo-secao">Adicionar à lista</h2>
            <details className="painel-recolhivel acao-recolhivel" open={lidos ? true : undefined}>
            <summary>Colar lista do WhatsApp</summary>
            <textarea
              id="colado"
              aria-label="Texto da lista do grupo"
              rows="4"
              value={colado}
              disabled={importando}
              onChange={(evento) => { definirColado(evento.target.value); definirLidos(null) }}
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
            <button type="button" className="botao" onClick={lerColado} disabled={importando || !colado.trim()}>
              Ler os nomes
            </button>

            {lidos && (
              <>
                <p className="ajuda">Confira os nomes sugeridos. Linhas em “Ignorar” não entram na lista.</p>
                {lidos.map((item, indice) => (
                  <div key={`${item.lido}-${indice}`} className="importacao__linha">
                    <strong>{item.lido}</strong>
                    <span className={item.certeza === 'exato' ? 'chip chip--pago' : 'chip chip--neutro'}>
                      {{ exato: 'Cadastrado', parecido: 'Sugestão', duvida: 'Mais de um possível', novo: 'Não encontrado' }[item.certeza]}
                    </span>
                    <select aria-label={`Jogador correspondente a ${item.lido}`} disabled={importando} value={item.escolha}
                      onChange={(evento) => definirLidos(lidos.map((linha, i) => i === indice ? { ...linha, escolha: evento.target.value } : linha))}>
                      <option value="">Ignorar</option>
                      <option value="@novo">Cadastrar como convidado</option>
                      {cadastrados.map((j) => <option key={j.id} value={j.id}>{j.nome}{j.apelido ? ` (${j.apelido})` : ''}</option>)}
                    </select>
                  </div>
                ))}
                <button type="button" className="botao botao--principal" onClick={confirmarLidos} disabled={importando || !lidos.some((item) => item.escolha)}>
                  {importando ? 'Salvando…' : 'Pôr na lista'}
                </button>
              </>
            )}
            </details>
            <details className="painel-recolhivel acao-recolhivel">
            <summary>Buscar jogador cadastrado</summary>
            <input
              aria-label="Buscar jogador"
              value={busca}
              onChange={(evento) => definirBusca(evento.target.value)}
              placeholder="Buscar nome ou apelido"
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

            </details>
            <details className="painel-recolhivel acao-recolhivel">
            <summary>Adicionar convidado</summary>
            <div className="acoes-times">
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
                Cadastrar e marcar chegada
              </button>
            </div>
            </details>
          </section>
        </>
      )}
    </>
  )
}
