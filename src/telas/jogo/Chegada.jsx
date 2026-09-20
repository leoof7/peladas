import { useState } from 'react'
import { agora, gravar, novoId } from '../../dados/api.js'
import { casarNomes, lerNomesColados } from '../../dados/regras.js'
import { semAcento } from '../../util/formato.js'

// Passo 1: quem chegou, na ordem. Serve pros dois tipos de pelada.
export default function Chegada({ peladaId, pelada, jogo, jogadores, ehDiretoria, salvar }) {
  const [busca, definirBusca] = useState('')
  const [colado, definirColado] = useState('')
  const [lidos, definirLidos] = useState(null)
  const [novoNome, definirNovoNome] = useState('')
  const [erro, definirErro] = useState('')

  const ehMensal = pelada.cobranca === 'mensal'
  const lista = jogo.lista || []
  const limite = ehMensal ? Number(pelada.config?.jogamPorDia || 22) : Number(pelada.config?.limiteVagas || 20)
  const porId = (id) => jogadores.find((jogador) => jogador.id === id)

  const disponiveis = jogadores
    .filter((jogador) => jogador.ativo !== false && !lista.includes(jogador.id))
    .filter((jogador) => !busca.trim() || semAcento(jogador.nome).includes(semAcento(busca)))
    .sort((um, outro) => (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'))

  function trocarOrdem(indice, direcao) {
    salvar((atual) => {
      const nova = [...(atual.lista || [])]
      const destino = indice + direcao
      if (destino < 0 || destino >= nova.length) return {}
      ;[nova[indice], nova[destino]] = [nova[destino], nova[indice]]
      return { lista: nova }
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
      await salvar((atual) => ({ lista: [...(atual.lista || []), jogadorId] }))
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
            <span className="numero__nome">chegaram</span>
          </div>
          <div className="numero">
            <span className="numero__valor">{Math.min(lista.length, limite)}</span>
            <span className="numero__nome">{ehMensal ? 'jogam' : 'na lista'}</span>
          </div>
          <div className="numero">
            <span className="numero__valor">{Math.max(0, lista.length - limite)}</span>
            <span className="numero__nome">{ehMensal ? 'de fora' : 'passaram das vagas'}</span>
          </div>
        </div>
        <p className="ajuda">
          {ehMensal
            ? `Ordem de chegada. Os primeiros ${limite} jogam; quem passar disso entra no 2º tempo.`
            : `A quadra tem ${limite} vagas. Quem chegar depois entra no time de fora.`}
        </p>
      </section>

      {ehDiretoria && (
        <section className="cartao">
          <h2 className="titulo-secao">Colar a lista do grupo</h2>
          <textarea
            id="colado"
            aria-label="Texto da lista"
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
              <p className="ajuda">Confira antes de entrar na lista:</p>
              {lidos.map((item, indice) => (
                <div key={`${item.lido}-${indice}`} className="linha">
                  <span className="linha__nome">
                    {item.lido}
                    {item.jogadorId && porId(item.jogadorId)?.nome !== item.lido && (
                      <span className="lista__detalhe"> → {porId(item.jogadorId)?.nome}</span>
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
      )}

      <section className="cartao">
        <h2 className="titulo-secao">Quem já chegou</h2>
        {lista.length === 0 ? (
          <p className="ajuda">Ninguém na lista ainda.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {lista.map((jogadorId, indice) => (
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
                <span className="linha__nome">{porId(jogadorId)?.nome || 'Jogador'}</span>
                {indice === limite && <span className="chip chip--neutro">2º tempo</span>}
                {ehDiretoria && (
                  <>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      aria-label="Subir na ordem"
                      onClick={() => trocarOrdem(indice, -1)}
                      disabled={indice === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      aria-label="Descer na ordem"
                      onClick={() => trocarOrdem(indice, 1)}
                      disabled={indice === lista.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      aria-label="Tirar da lista"
                      onClick={() => salvar((atual) => ({ lista: (atual.lista || []).filter((outro) => outro !== jogadorId) }))}
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {ehDiretoria && (
        <section className="cartao">
          <h2 className="titulo-secao">Marcar quem chegou</h2>
          <input
            aria-label="Buscar jogador"
            value={busca}
            onChange={(evento) => definirBusca(evento.target.value)}
            placeholder="Buscar pelo nome"
            style={{ height: 48, border: '1px solid #d6d0c3', borderRadius: 12, padding: '0 12px' }}
          />
          {disponiveis.length === 0 ? (
            <p className="ajuda">Todo mundo já está na lista.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {disponiveis.slice(0, 30).map((jogador) => (
                <button
                  key={jogador.id}
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() => salvar((atual) => ({ lista: [...(atual.lista || []), jogador.id] }))}
                >
                  + {jogador.nome}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              aria-label="Nome do convidado"
              value={novoNome}
              onChange={(evento) => definirNovoNome(evento.target.value)}
              placeholder="Convidado de hoje"
              style={{ flexGrow: 1, height: 48, border: '1px solid #d6d0c3', borderRadius: 12, padding: '0 12px' }}
            />
            <button type="button" className="botao botao--contorno" onClick={adicionarConvidado}>
              Cadastrar
            </button>
          </div>
        </section>
      )}
    </>
  )
}
