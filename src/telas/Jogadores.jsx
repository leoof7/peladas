import { useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { agora, apagar, gravar, novoId } from '../dados/api.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { irPara } from '../util/rotas.js'

const POSICOES = [
  { chave: 'goleiro', curto: 'GOL', nome: 'Goleiro' },
  { chave: 'defesa', curto: 'DEF', nome: 'Defesa' },
  { chave: 'meio', curto: 'MEI', nome: 'Meio' },
  { chave: 'ataque', curto: 'ATA', nome: 'Ataque' },
]

const VAZIO = {
  nome: '',
  apelido: '',
  posicao: 'meio',
  tipoJogador: 'fixo',
  isento: false,
  ativo: true,
}

export default function Jogadores({ peladaId, usuario }) {
  const { pelada, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [emEdicao, definirEmEdicao] = useState(null)
  const [mostrarInativos, definirMostrarInativos] = useState(false)
  const [erro, definirErro] = useState('')

  const lista = jogadores
    .filter((jogador) => mostrarInativos || jogador.ativo !== false)
    .sort((um, outro) => (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'))

  async function salvar(evento) {
    evento.preventDefault()
    const dados = { ...emEdicao }
    const id = dados.id || novoId()
    delete dados.id
    if (!dados.nome?.trim()) return
    dados.nome = dados.nome.trim()
    dados.apelido = (dados.apelido || '').trim()
    try {
      await gravar(`peladas/${peladaId}/jogadores/${id}`, { ...dados, criadoEm: dados.criadoEm || agora() })
      definirEmEdicao(null)
      definirErro('')
    } catch {
      definirErro('Não consegui salvar. Só a diretoria pode cadastrar jogador.')
    }
  }

  async function zerarPin(jogador) {
    try {
      await apagar(`peladas/${peladaId}/pins/${jogador.id}`)
      definirErro('')
    } catch {
      definirErro('Não consegui zerar o PIN.')
    }
  }

  if (carregando) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Carregando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Jogadores"
        linha={`${jogadores.filter((jogador) => jogador.ativo !== false).length} ativos`}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <div className="conteudo">
        {erro && <p className="erro">{erro}</p>}

        {ehDiretoria && !emEdicao && (
          <button type="button" className="botao botao--principal" onClick={() => definirEmEdicao({ ...VAZIO })}>
            Cadastrar jogador
          </button>
        )}

        {emEdicao && (
          <form className="cartao" onSubmit={salvar}>
            <h2 className="titulo-secao">{emEdicao.id ? 'Editar jogador' : 'Novo jogador'}</h2>

            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                value={emEdicao.nome}
                onChange={(evento) => definirEmEdicao({ ...emEdicao, nome: evento.target.value })}
                autoComplete="off"
              />
            </div>

            <div className="campo">
              <label htmlFor="apelido">Apelido (opcional)</label>
              <input
                id="apelido"
                value={emEdicao.apelido}
                onChange={(evento) => definirEmEdicao({ ...emEdicao, apelido: evento.target.value })}
                autoComplete="off"
              />
            </div>

            <div className="campo">
              <label htmlFor="posicao">Posição</label>
              <select
                id="posicao"
                value={emEdicao.posicao}
                onChange={(evento) => definirEmEdicao({ ...emEdicao, posicao: evento.target.value })}
              >
                {POSICOES.map((posicao) => (
                  <option key={posicao.chave} value={posicao.chave}>
                    {posicao.nome}
                  </option>
                ))}
              </select>
              <p className="ajuda">Lateral e volante contam como defesa.</p>
            </div>

            <div className="campo">
              <label htmlFor="tipo-jogador">Tipo</label>
              <select
                id="tipo-jogador"
                value={emEdicao.tipoJogador}
                onChange={(evento) => definirEmEdicao({ ...emEdicao, tipoJogador: evento.target.value })}
              >
                <option value="fixo">Fixo</option>
                <option value="convidado">Convidado</option>
              </select>
            </div>

            <label className="lista__item lista__item--fixo" style={{ padding: 0 }}>
              <input
                type="checkbox"
                checked={emEdicao.isento}
                onChange={(evento) => definirEmEdicao({ ...emEdicao, isento: evento.target.checked })}
                style={{ width: 22, height: 22 }}
              />
              <span className="lista__textos">
                <span className="lista__nome">Não paga (isento)</span>
                <span className="lista__detalhe">Ex.: goleiro fixo. Gols e presença continuam contando.</span>
              </span>
            </label>

            {emEdicao.id && (
              <label className="lista__item lista__item--fixo" style={{ padding: 0 }}>
                <input
                  type="checkbox"
                  checked={emEdicao.ativo !== false}
                  onChange={(evento) => definirEmEdicao({ ...emEdicao, ativo: evento.target.checked })}
                  style={{ width: 22, height: 22 }}
                />
                <span className="lista__textos">
                  <span className="lista__nome">Continua na pelada</span>
                  <span className="lista__detalhe">Desmarque quem saiu. O histórico dele fica guardado.</span>
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="botao" onClick={() => definirEmEdicao(null)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" className="botao botao--principal" style={{ flex: 1 }}>
                Salvar
              </button>
            </div>
          </form>
        )}

        {lista.length === 0 ? (
          <p className="ajuda">Nenhum jogador cadastrado ainda.</p>
        ) : (
          <ul className="lista">
            {lista.map((jogador) => (
              <li key={jogador.id}>
                <div className="lista__item lista__item--fixo">
                  <span className="lista__textos">
                    <span className="lista__nome">
                      {jogador.nome}
                      {jogador.ativo === false && ' · saiu'}
                    </span>
                    <span className="lista__detalhe">
                      {[
                        jogador.apelido,
                        jogador.tipoJogador === 'convidado' ? 'convidado' : 'fixo',
                        jogador.isento ? 'isento' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="selo selo--posicao">
                    {POSICOES.find((posicao) => posicao.chave === jogador.posicao)?.curto || '—'}
                  </span>
                  {ehDiretoria && (
                    <button
                      type="button"
                      className="botao botao--pequeno"
                      onClick={() => definirEmEdicao({ ...VAZIO, ...jogador })}
                    >
                      Editar
                    </button>
                  )}
                </div>
                {ehDiretoria && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <button type="button" className="botao botao--pequeno" onClick={() => zerarPin(jogador)}>
                      Zerar PIN
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="botao"
          onClick={() => definirMostrarInativos(!mostrarInativos)}
        >
          {mostrarInativos ? 'Esconder quem saiu' : 'Mostrar quem saiu'}
        </button>
      </div>
    </div>
  )
}
