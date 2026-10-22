import { useEffect, useRef, useState } from 'react'
import Avatar from '../componentes/Avatar.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import Nota from '../componentes/Nota.jsx'
import { agora, apagar, gravar, novoId } from '../dados/api.js'
import {
  POSICOES,
  daPosicao,
  mediaDoGrupo,
  notaEmNumero,
  ordenarPorEstrela,
  ordenarPorNome,
  textoPraColar,
} from '../dados/estrelas.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { semAcento } from '../util/formato.js'
import { irPara } from '../util/rotas.js'
import FichaJogador from './jogadores/FichaJogador.jsx'

// Arrastar o dedo muda a nota muitas vezes por segundo. A tela acompanha na
// hora, mas o banco só recebe quando o dedo descansa.
const ESPERA_PRA_GRAVAR = 600

// "Rafa · 13:35" se foi hoje; de outro dia, entra a data.
function quemMexeu(jogador) {
  if (!jogador.estrelasPor) return ''
  const momento = new Date(jogador.estrelasEm || '')
  if (Number.isNaN(momento.getTime())) return jogador.estrelasPor
  const hora = momento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const ehHoje = momento.toDateString() === new Date().toDateString()
  if (ehHoje) return `${jogador.estrelasPor} · ${hora}`
  const dia = momento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${jogador.estrelasPor} · ${dia} ${hora}`
}

// Estes dois ficam fora da tela de propósito: componente criado dentro do
// render vira um componente novo a cada desenho, e o campo de texto perderia o
// foco a cada letra digitada.
function Pessoa({ jogador, grande, ehDiretoria, aoAbrirFicha }) {
  const dentro = (
    <>
      <Avatar nome={jogador.nome} foto={jogador.foto} tamanho={grande ? 'grande' : 'normal'} />
      <span className={grande ? 'card__nome' : 'lista__nome-bloco'}>
        <strong>{jogador.nome}</strong>
        {!grande && <span className="lista__detalhe">{detalhesDoJogador(jogador)}</span>}
      </span>
    </>
  )
  const classe = grande ? 'card__pessoa' : 'lista__pessoa'
  if (!ehDiretoria) return <span className={classe}>{dentro}</span>
  return (
    <button type="button" className={classe} onClick={aoAbrirFicha} title="Abrir a ficha">
      {dentro}
    </button>
  )
}

function NomeEditavel({ jogador, valor, aoEscrever, aoSalvar, aoCancelar }) {
  return (
    <input
      className="nome-editavel"
      autoFocus
      value={valor}
      onChange={(evento) => aoEscrever(evento.target.value)}
      onBlur={aoSalvar}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault()
          evento.currentTarget.blur()
        } else if (evento.key === 'Escape') {
          aoCancelar()
        }
      }}
      aria-label={`Nome de ${jogador.nome}`}
    />
  )
}

function detalhesDoJogador(jogador) {
  return (
    [
      jogador.apelido,
      jogador.tipoJogador === 'convidado' ? 'convidado' : null,
      jogador.isento ? 'não paga' : null,
      jogador.ativo === false ? 'saiu' : null,
    ]
      .filter(Boolean)
      .join(' · ') || ''
  )
}

export default function Jogadores({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [ficha, definirFicha] = useState(null)
  const [editandoNome, definirEditandoNome] = useState(null)
  const [nomeEmEdicao, definirNomeEmEdicao] = useState('')
  const [visao, definirVisao] = useState('lista')
  const [porEstrela, definirPorEstrela] = useState(null)
  const [mostrarInativos, definirMostrarInativos] = useState(false)
  const [rascunho, definirRascunho] = useState({})
  const [erro, definirErro] = useState('')
  const [recado, definirRecado] = useState('')
  const [textoNaTela, definirTextoNaTela] = useState('')
  const pendentes = useRef({})
  const temporizador = useRef(null)

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const eu = jogadores.find((jogador) => jogador.id === membro?.jogadorId)
  const meuNome = eu?.nome || 'diretoria'

  function avisar(texto) {
    definirRecado(texto)
    setTimeout(() => definirRecado(''), 2500)
  }

  // ---- estrelas ----

  async function enviarNotas() {
    const aGravar = pendentes.current
    pendentes.current = {}
    const momento = agora()
    try {
      await Promise.all(
        Object.entries(aGravar).map(([id, nota]) =>
          gravar(`peladas/${peladaId}/jogadores/${id}`, {
            estrelas: nota,
            estrelasPor: meuNome,
            estrelasEm: momento,
          }),
        ),
      )
      definirErro('')
      // Gravou: solta a cópia da tela pra voltar a seguir o banco ao vivo.
      definirRascunho((atual) => {
        const limpo = { ...atual }
        for (const [id, nota] of Object.entries(aGravar)) if (limpo[id] === nota) delete limpo[id]
        return limpo
      })
    } catch {
      definirErro('Não consegui salvar a estrela. Só a diretoria mexe nas notas.')
      definirRascunho({})
    }
  }

  function mudarNota(jogador, nota) {
    pendentes.current = { ...pendentes.current, [jogador.id]: nota }
    definirRascunho((atual) => ({ ...atual, [jogador.id]: nota }))
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(enviarNotas, ESPERA_PRA_GRAVAR)
  }

  function notaNaTela(jogador) {
    return rascunho[jogador.id] ?? jogador.estrelas ?? 0
  }

  // ---- nome, direto na lista ----

  function abrirNome(jogador) {
    if (!ehDiretoria) return
    definirEditandoNome(jogador.id)
    definirNomeEmEdicao(jogador.nome || '')
  }

  async function salvarNome(jogador) {
    const limpo = nomeEmEdicao.trim()
    definirEditandoNome(null)
    if (limpo.length < 2 || limpo === jogador.nome) return
    const repetido = jogadores.some(
      (outro) => outro.id !== jogador.id && semAcento(outro.nome) === semAcento(limpo),
    )
    if (repetido) {
      definirErro(`Já existe um "${limpo}". Escreva de um jeito que dê pra diferenciar.`)
      return
    }
    try {
      await gravar(`peladas/${peladaId}/jogadores/${jogador.id}`, { nome: limpo })
      definirErro('')
    } catch {
      definirErro('Não consegui mudar o nome. Só a diretoria edita.')
    }
  }

  // ---- ficha ----

  async function salvarFicha(dados) {
    const id = dados.id || novoId()
    const nome = (dados.nome || '').trim()
    if (nome.length < 2) {
      definirErro('Escreva o nome do jogador.')
      return
    }
    const repetido = jogadores.some(
      (jogador) => jogador.id !== id && semAcento(jogador.nome) === semAcento(nome),
    )
    if (repetido) {
      definirErro('Já existe um jogador com esse nome. Escreva de um jeito que dê pra diferenciar.')
      return
    }
    const campos = { ...dados, nome, apelido: (dados.apelido || '').trim() }
    delete campos.id
    try {
      await gravar(`peladas/${peladaId}/jogadores/${id}`, {
        ...campos,
        criadoEm: campos.criadoEm || agora(),
      })
      definirFicha(null)
      definirErro('')
    } catch {
      definirErro('Não consegui salvar. Só a diretoria cadastra jogador.')
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

  async function copiar(lista) {
    const texto = textoPraColar(lista)
    if (!texto) {
      definirErro('Ninguém cadastrado ainda.')
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      avisar('Copiado. É só colar no grupo.')
    } catch {
      // Navegador que não deixa copiar sozinho: mostra o texto pra copiar na mão.
      definirTextoNaTela(texto)
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

  // Sem ser da pelada, não tem o que fazer nesta tela.
  if (!membro) {
    return (
      <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
        <Cabecalho titulo="Jogadores" aoVoltar={() => irPara('/')} />
        <div className="conteudo">
          <p className="erro">Você não está nesta pelada neste aparelho.</p>
          <button
            type="button"
            className="botao botao--principal"
            onClick={() => irPara(`/p/${peladaId}/entrar`)}
          >
            Entrar na pelada
          </button>
          <button type="button" className="botao" onClick={() => irPara('/')}>
            Voltar pro início
          </button>
        </div>
      </div>
    )
  }

  const visiveis = jogadores.filter((jogador) => mostrarInativos || jogador.ativo !== false)
  const comNotaDaTela = visiveis.map((jogador) => ({ ...jogador, estrelas: notaNaTela(jogador) }))
  const media = mediaDoGrupo(comNotaDaTela)
  const ativos = jogadores.filter((jogador) => jogador.ativo !== false).length

  // A ordem por estrela é uma foto do momento: se a lista se reorganizasse a
  // cada toque, o jogador fugiria debaixo do dedo.
  function ordenar(doGrupo) {
    if (!porEstrela) return ordenarPorNome(doGrupo)
    const lugar = (jogador) => {
      const posicao = porEstrela.indexOf(jogador.id)
      return posicao === -1 ? 999 : posicao
    }
    return [...doGrupo].sort((um, outro) => lugar(um) - lugar(outro))
  }

  function alternarOrdem() {
    if (porEstrela) {
      definirPorEstrela(null)
      return
    }
    definirPorEstrela(ordenarPorEstrela(comNotaDaTela).map((jogador) => jogador.id))
    avisar('Do melhor pro pior. Toque de novo pra voltar à ordem dos nomes.')
  }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Jogadores"
        linha={`${ativos} ativos${media > 0 ? ` · média ${notaEmNumero(media)}` : ''}`}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <div className="conteudo">
        {erro && <p className="erro">{erro}</p>}
        {recado && <p className="recado">{recado}</p>}

        {textoNaTela && (
          <section className="cartao">
            <h2 className="titulo-secao">Copie daqui e cole no grupo</h2>
            <textarea className="area-texto" readOnly rows={10} value={textoNaTela} />
            <button type="button" className="botao" onClick={() => definirTextoNaTela('')}>
              Fechar
            </button>
          </section>
        )}

        {ficha && ehDiretoria && (
          <FichaJogador
            key={ficha.id || 'novo'}
            jogador={ficha.id ? ficha : null}
            erro={erro}
            aoSalvar={salvarFicha}
            aoZerarPin={() => zerarPin(ficha)}
            aoFechar={() => definirFicha(null)}
          />
        )}

        {!ficha && (
          <>
            <div className="barra-de-jeitos">
              <div className="alternador" role="group" aria-label="Como mostrar os jogadores">
                <button
                  type="button"
                  className={`alternador__item${visao === 'lista' ? ' alternador__item--ativo' : ''}`}
                  aria-pressed={visao === 'lista'}
                  onClick={() => definirVisao('lista')}
                >
                  Lista
                </button>
                <button
                  type="button"
                  className={`alternador__item${visao === 'cards' ? ' alternador__item--ativo' : ''}`}
                  aria-pressed={visao === 'cards'}
                  onClick={() => definirVisao('cards')}
                >
                  Cards
                </button>
              </div>
              <button
                type="button"
                className="botao botao--pequeno"
                aria-pressed={Boolean(porEstrela)}
                onClick={alternarOrdem}
              >
                {porEstrela ? 'Por nome' : 'Do melhor pro pior'}
              </button>
            </div>

            {ehDiretoria && (
              <p className="ajuda">
                Toque no nome pra corrigir. Toque na foto pra abrir a ficha. A estrela muda no
                toque ou arrastando o dedo, de meia em meia.
              </p>
            )}

            {visiveis.length === 0 ? (
              <p className="ajuda">Nenhum jogador cadastrado ainda.</p>
            ) : (
              POSICOES.map((posicao) => {
                const doGrupo = ordenar(daPosicao(comNotaDaTela, posicao.chave))
                if (doGrupo.length === 0) return null
                return (
                  <section key={posicao.chave} className="grupo">
                    <h2 className="grupo__titulo">
                      {posicao.titulo} <span>{doGrupo.length}</span>
                    </h2>

                    {visao === 'lista' ? (
                      <div className="quadro">
                        {doGrupo.map((jogador) => (
                          <div
                            key={jogador.id}
                            className={`quadro__item${jogador.ativo === false ? ' quadro__item--saiu' : ''}`}
                          >
                            {editandoNome === jogador.id ? (
                              <NomeEditavel
                                jogador={jogador}
                                valor={nomeEmEdicao}
                                aoEscrever={definirNomeEmEdicao}
                                aoSalvar={() => salvarNome(jogador)}
                                aoCancelar={() => definirEditandoNome(null)}
                              />
                            ) : (
                              <>
                                <Pessoa
                                  jogador={jogador}
                                  ehDiretoria={ehDiretoria}
                                  aoAbrirFicha={() => definirFicha(jogador)}
                                />
                                {ehDiretoria && (
                                  <button
                                    type="button"
                                    className="botao-lapis"
                                    onClick={() => abrirNome(jogador)}
                                    aria-label={`Mudar o nome de ${jogador.nome}`}
                                  >
                                    ✎
                                  </button>
                                )}
                              </>
                            )}
                            <span className="quadro__nota">
                              <Nota
                                valor={jogador.estrelas}
                                aoMudar={(nota) => mudarNota(jogador, nota)}
                                rotulo={`Estrelas de ${jogador.nome}`}
                                somenteLeitura={!ehDiretoria}
                              />
                              <span className="mexeu">{quemMexeu(jogador)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="cards">
                        {doGrupo.map((jogador) => (
                          <div
                            key={jogador.id}
                            className={`card card--${Math.ceil(jogador.estrelas || 0)}${
                              jogador.ativo === false ? ' card--saiu' : ''
                            }`}
                          >
                            <Pessoa
                              jogador={jogador}
                              grande
                              ehDiretoria={ehDiretoria}
                              aoAbrirFicha={() => definirFicha(jogador)}
                            />
                            <Nota
                              valor={jogador.estrelas}
                              aoMudar={(nota) => mudarNota(jogador, nota)}
                              rotulo={`Estrelas de ${jogador.nome}`}
                              tamanho="pequeno"
                              somenteLeitura={!ehDiretoria}
                            />
                            <span className="mexeu">{quemMexeu(jogador)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )
              })
            )}

            <div className="fileira-de-botoes">
              {ehDiretoria && (
                <button
                  type="button"
                  className="botao botao--principal"
                  onClick={() => definirFicha({})}
                >
                  Cadastrar jogador
                </button>
              )}
              <button type="button" className="botao" onClick={() => copiar(comNotaDaTela)}>
                Copiar pro grupo
              </button>
              <button
                type="button"
                className="botao"
                onClick={() => definirMostrarInativos(!mostrarInativos)}
              >
                {mostrarInativos ? 'Esconder quem saiu' : 'Mostrar quem saiu'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
