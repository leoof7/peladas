import Abas from '../componentes/Abas.jsx'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../componentes/Avatar.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import Nota from '../componentes/Nota.jsx'
import { agora, apagar, gravar, gravarLote, novoId } from '../dados/api.js'
import { lerEstrelasColadas } from '../dados/importarEstrelas.js'
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
import Cartinha, { CartaJogador } from './jogadores/Cartinha.jsx'
import { useColecao } from '../dados/useColecao.js'
import { estatisticasDoAno } from '../dados/regras.js'

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
// A foto abre a ficha, o nome abre a correção do nome. Dois alvos separados,
// sem lapisinho roubando a largura do nome.
function Retrato({ jogador, tamanho, ehDiretoria, aoAbrirFicha }) {
  const avatar = <Avatar nome={jogador.nome} foto={jogador.foto} tamanho={tamanho} />
  if (!ehDiretoria) return avatar
  return (
    <button
      type="button"
      className="retrato"
      onClick={aoAbrirFicha}
      aria-label={`Ficha de ${jogador.nome}`}
    >
      {avatar}
    </button>
  )
}

function NomeDoJogador({ jogador, ehDiretoria, aoAbrirNome }) {
  const dentro = (
    <>
      <strong>{jogador.nome}</strong>
      <span className="lista__detalhe">{detalhesDoJogador(jogador)}</span>
    </>
  )
  if (!ehDiretoria) return <span className="quadro__nome">{dentro}</span>
  return (
    <button
      type="button"
      className="quadro__nome"
      onClick={aoAbrirNome}
      aria-label={`Mudar o nome de ${jogador.nome}`}
    >
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
  const jogos = useColecao(membro ? `peladas/${peladaId}/jogos` : null)
  const ano = new Date().getFullYear()
  const estatisticas = estatisticasDoAno(jogos, jogadores, ano)
  const [cartaAberta, definirCartaAberta] = useState(null)
  const [ficha, definirFicha] = useState(null)
  const [editandoNome, definirEditandoNome] = useState(null)
  const [nomeEmEdicao, definirNomeEmEdicao] = useState('')
  const [busca, definirBusca] = useState('')
  const [visao, definirVisao] = useState('lista')
  const [porEstrela, definirPorEstrela] = useState(null)
  const [ordem, definirOrdem] = useState('posicao')
  const [posicaoFiltrada, definirPosicaoFiltrada] = useState('todas')
  const [mostrarInativos, definirMostrarInativos] = useState(false)
  const [rascunho, definirRascunho] = useState({})
  const [erro, definirErro] = useState('')
  const [recado, definirRecado] = useState('')
  const [textoNaTela, definirTextoNaTela] = useState('')
  const [textoEstrelas, definirTextoEstrelas] = useState('')
  const [importacao, definirImportacao] = useState(null)
  const [importando, definirImportando] = useState(false)
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

  async function excluirJogador(jogador) {
    try {
      await apagar(`peladas/${peladaId}/jogadores/${jogador.id}`)
      await apagar(`peladas/${peladaId}/pins/${jogador.id}`).catch(() => {})
      definirFicha(null)
      definirErro('')
      avisar(`${jogador.nome} foi apagado.`)
    } catch {
      definirErro('Não consegui apagar. Só a diretoria exclui jogador.')
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

  async function aplicarEstrelas() {
    const selecionados = importacao?.filter((item) => item.aplicar) || []
    if (!ehDiretoria || importando || !selecionados.length) return
    if (selecionados.some(({ jogadorId, anterior }) => {
      const jogador = jogadores.find((j) => j.id === jogadorId)
      return !jogador || jogador.ativo === false || (jogador.estrelas ?? 0) !== anterior || jogadorId in rascunho
    })) {
      definirErro('Uma nota mudou desde a revisão. Confira o texto novamente antes de salvar.')
      return
    }
    if (selecionados.length > 500) {
      definirErro('Divida o texto em partes com até 500 jogadores.')
      return
    }
    definirImportando(true)
    definirErro('')
    try {
      await gravarLote(selecionados.map(({ jogadorId, nota }) => ({
        caminho: `peladas/${peladaId}/jogadores/${jogadorId}`,
        dados: { estrelas: nota, estrelasPor: meuNome, estrelasEm: agora() },
      })))
      definirTextoEstrelas('')
      definirImportacao(null)
      avisar('Estrelas importadas.')
    } catch {
      definirErro('Não consegui importar as estrelas. Tente novamente.')
    } finally {
      definirImportando(false)
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

  const procurado = semAcento(busca.trim())
  const visiveis = jogadores.filter((jogador) => (mostrarInativos || jogador.ativo !== false) && (posicaoFiltrada === 'todas' || jogador.posicao === posicaoFiltrada) && (!procurado || [jogador.nome, jogador.apelido].some((nome) => semAcento(nome || '').includes(procurado))))
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

  function mudarOrdem(novaOrdem) {
    definirOrdem(novaOrdem)
    definirPorEstrela(novaOrdem === 'estrelas' ? ordenarPorEstrela(comNotaDaTela).map((jogador) => jogador.id) : null)
  }

  const jogadorDaCarta = comNotaDaTela.find((item) => item.id === cartaAberta) || jogadores.find((item) => item.id === cartaAberta)
  const grupos = ordem === 'posicao' ? POSICOES : [{ chave: 'todos', titulo: 'Jogadores' }]

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

        {jogadorDaCarta && <Cartinha
          jogador={jogadorDaCarta}
          dados={estatisticas.find((item) => item.jogadorId === jogadorDaCarta.id)}
          ano={ano}
          aoMudarNota={ehDiretoria ? (nota) => mudarNota(jogadorDaCarta, nota) : undefined}
          quemAlterou={ehDiretoria ? quemMexeu(jogadorDaCarta) : undefined}
          aoFechar={() => definirCartaAberta(null)}
          aoEditar={ehDiretoria ? () => { definirFicha(jogadorDaCarta); definirCartaAberta(null) } : undefined}
        />}

        {ficha && ehDiretoria && (
          <FichaJogador
            key={ficha.id || 'novo'}
            jogador={ficha.id ? ficha : null}
            erro={erro}
            aoSalvar={salvarFicha}
            aoZerarPin={() => zerarPin(ficha)}
            aoExcluir={() => excluirJogador(ficha)}
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
            </div>
            {ehDiretoria && <details className="cartao painel-recolhivel">
              <summary>Importar estrelas do WhatsApp</summary>
              <label className="campo">Lista com as notas
                <textarea className="area-texto" rows={4} value={textoEstrelas} disabled={importando}
                  placeholder="Nome ou apelido ⭐⭐⭐,5"
                  onChange={(evento) => { definirTextoEstrelas(evento.target.value); definirImportacao(null) }} />
              </label>
              <button type="button" className="botao" disabled={!textoEstrelas.trim() || importando}
                onClick={() => definirImportacao(lerEstrelasColadas(textoEstrelas, jogadores))}>Revisar notas</button>
              {importacao?.length === 0 && <p className="ajuda">Não encontrei linhas com estrelas válidas.</p>}
              {importacao?.map((item, indice) => {
                const nome = jogadores.find((j) => j.id === item.jogadorId)?.nome
                return <label className="linha" key={indice}>
                  <input type="checkbox" checked={item.aplicar} disabled={!nome || item.repetido || importando}
                    onChange={(evento) => definirImportacao(importacao.map((linha, i) => i === indice ? { ...linha, aplicar: evento.target.checked } : linha))} />
                  <span className="linha__nome">{item.nome}{nome && item.nome !== nome ? ` → ${nome}` : ''}
                    <span className="lista__detalhe">{item.repetido ? ' · repetido na lista' : !nome ? ' · sem correspondência única' : item.anterior ? ` · atual: ${notaEmNumero(item.anterior)}` : ''}</span>
                  </span>
                  <strong>{notaEmNumero(item.nota)} ★</strong>
                </label>
              })}
              {Boolean(importacao?.length) && <button type="button" className="botao botao--principal"
                onClick={aplicarEstrelas} disabled={importando || !importacao.some((item) => item.aplicar)}>
                {importando ? 'Importando…' : 'Salvar notas selecionadas'}
              </button>}
            </details>}
            <label className="campo busca-jogadores">Buscar jogador<input type="search" value={busca} placeholder="Nome ou apelido" onChange={(evento) => definirBusca(evento.target.value)} /></label>
            <div className="filtros-jogadores">
              <label>Posição
                <select value={posicaoFiltrada} onChange={(evento) => definirPosicaoFiltrada(evento.target.value)}>
                  <option value="todas">Todas as posições</option>
                  {POSICOES.map((posicao) => <option key={posicao.chave} value={posicao.chave}>{posicao.titulo}</option>)}
                </select>
              </label>
              <label>Ordenar por
                <select value={ordem} onChange={(evento) => mudarOrdem(evento.target.value)}>
                  <option value="posicao">Posição</option>
                  <option value="estrelas">Mais estrelas</option>
                  <option value="nome">Nome</option>
                </select>
              </label>
            </div>

            {ehDiretoria && (
              <p className="ajuda">
                {visao === 'cards' ? 'Toque na carta para ampliar, ver as estatísticas e ajustar as estrelas. Na carta aberta, a nota muda no' : 'Toque no nome pra corrigir. Toque na foto pra abrir a ficha. A estrela muda no'}
                toque ou arrastando o dedo, de meia em meia.
              </p>
            )}

            {visiveis.length === 0 ? (
              <p className="ajuda">Nenhum jogador encontrado com esse filtro.</p>
            ) : (
              grupos.map((posicao) => {
                const doGrupo = ordenar(posicao.chave === 'todos' ? comNotaDaTela : daPosicao(comNotaDaTela, posicao.chave))
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
                            <Retrato
                              jogador={jogador}
                              tamanho="normal"
                              ehDiretoria={ehDiretoria}
                              aoAbrirFicha={() => definirFicha(jogador)}
                            />
                            {editandoNome === jogador.id ? (
                              <NomeEditavel
                                jogador={jogador}
                                valor={nomeEmEdicao}
                                aoEscrever={definirNomeEmEdicao}
                                aoSalvar={() => salvarNome(jogador)}
                                aoCancelar={() => definirEditandoNome(null)}
                              />
                            ) : (
                              <NomeDoJogador
                                jogador={jogador}
                                ehDiretoria={ehDiretoria}
                                aoAbrirNome={() => abrirNome(jogador)}
                              />
                            )}
                            <span className="quadro__nota">
                              <Nota
                                valor={jogador.estrelas}
                                aoMudar={(nota) => mudarNota(jogador, nota)}
                                rotulo={`Estrelas de ${jogador.nome}`}
                                somenteLeitura={!ehDiretoria}
                              />
                              {ehDiretoria && <span className="mexeu">{quemMexeu(jogador)}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="cards">
                        {doGrupo.map((jogador) => (
                          <div key={jogador.id} className="carta-conjunto">
                            <CartaJogador jogador={jogador} dados={estatisticas.find((item) => item.jogadorId === jogador.id)} aoAbrir={() => definirCartaAberta(jogador.id)} />

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
      {!ficha && <Abas peladaId={peladaId} atual="jogadores" />}
    </div>
  )
}
