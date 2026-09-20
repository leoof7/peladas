import { useState } from 'react'
import Abas from '../componentes/Abas.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import Pix from '../componentes/Pix.jsx'
import { agora, gravar, novoId } from '../dados/api.js'
import {
  centavos,
  emAbertoDoJogador,
  emReais,
  mensalidadesDoMes,
  nomeDoMes,
  resumoDoDinheiroDoJogo,
} from '../dados/regras.js'
import { useColecao, useDoc } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { anoDe, dataCurta, dinheiro, hoje } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

export default function Financeiro({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const jogos = useColecao(peladaId ? `peladas/${peladaId}/jogos` : null)
  const caixa = useColecao(peladaId ? `peladas/${peladaId}/caixa` : null)
  const ano = anoDe(hoje())
  const mensalidades = useDoc(peladaId ? `peladas/${peladaId}/mensalidades/${ano}` : null)
  const [mes, definirMes] = useState(hoje().slice(5, 7))
  const [secao, definirSecao] = useState(null)
  const [lancamento, definirLancamento] = useState({ descricao: '', valor: '', tipo: 'saida', data: hoje() })
  const [erro, definirErro] = useState('')

  if (carregando) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!membro) {
    irPara(`/p/${peladaId}/entrar`)
    return null
  }

  const ehMensal = pelada.cobranca === 'mensal'
  const valorMensalidade = Number(pelada.config?.mensalidade || 0)
  const meuJogadorId = membro.jogadorId
  const recebedores = pelada.config?.recebedores || []
  const doAno = jogos.filter((jogo) => anoDe(jogo.data) === ano && jogo.status !== 'cancelado')

  const secoes = ehDiretoria
    ? [
        ...(ehMensal ? [{ chave: 'mensalidades', nome: 'Mensalidades' }] : []),
        { chave: 'dias', nome: ehMensal ? 'Domingos' : 'Peladas' },
        { chave: 'caixa', nome: 'Caixa' },
        { chave: 'meu', nome: 'O meu' },
      ]
    : [{ chave: 'meu', nome: 'O meu' }]
  const secaoAtual = secao ?? secoes[0].chave

  const doMes = mensalidadesDoMes(jogadores, mensalidades, ano, mes, valorMensalidade)
  const pagosNoMes = doMes.filter((linha) => linha.pago)

  async function marcarMensalidade(jogadorId, pago) {
    const chave = `${ano}-${mes}`
    const atual = mensalidades?.[chave] || {}
    try {
      await gravar(`peladas/${peladaId}/mensalidades/${ano}`, {
        valor: valorMensalidade,
        [chave]: { ...atual, [jogadorId]: { pago, em: agora() } },
      })
      definirErro('')
    } catch {
      definirErro('Não consegui marcar. Só a diretoria pode.')
    }
  }

  async function marcarMesInteiro(pago) {
    const chave = `${ano}-${mes}`
    const novo = {}
    for (const linha of doMes) novo[linha.jogadorId] = { pago, em: agora() }
    try {
      await gravar(`peladas/${peladaId}/mensalidades/${ano}`, { valor: valorMensalidade, [chave]: novo })
      definirErro('')
    } catch {
      definirErro('Não consegui marcar o mês.')
    }
  }

  async function guardarLancamento(evento) {
    evento.preventDefault()
    const valor = Number(String(lancamento.valor).replace(/\./g, '').replace(',', '.'))
    if (!lancamento.descricao.trim() || !Number.isFinite(valor) || valor <= 0) {
      definirErro('Escreva o que foi e um valor, como 120 ou 120,50.')
      return
    }
    try {
      await gravar(
        `peladas/${peladaId}/caixa/${novoId()}`,
        { ...lancamento, valor, criadoEm: agora() },
        { mesclar: false },
      )
      definirLancamento({ descricao: '', valor: '', tipo: 'saida', data: hoje() })
      definirErro('')
    } catch {
      definirErro('Não consegui lançar no caixa.')
    }
  }

  // Quanto entrou de verdade: mensalidades marcadas + pagamentos dos dias.
  const recebidoMensalidades = Object.entries(mensalidades || {})
    .filter(([chave]) => chave.startsWith(`${ano}-`))
    .reduce(
      (total, [, doMesGuardado]) =>
        total +
        Object.values(doMesGuardado || {}).filter((registro) => registro?.pago).length *
          centavos(mensalidades?.valor ?? valorMensalidade),
      0,
    )
  const recebidoDias = doAno.reduce(
    (total, jogo) => total + centavos(resumoDoDinheiroDoJogo(pelada, jogo, jogadores).recebido),
    0,
  )
  const entradasManuais = caixa
    .filter((item) => item.tipo === 'entrada')
    .reduce((total, item) => total + centavos(item.valor), 0)
  const saidas = caixa.filter((item) => item.tipo === 'saida').reduce((total, item) => total + centavos(item.valor), 0)
  const saldo = emReais(recebidoMensalidades + recebidoDias + entradasManuais - saidas)

  // O que é meu: mensalidades do ano e os dias em que eu devo.
  const minhaConta = emAbertoDoJogador({
    pelada,
    jogos,
    jogadores,
    mensalidades,
    jogadorId: meuJogadorId,
    ano,
    mesAtual: hoje().slice(5, 7),
  })
  const minhasMensalidades = minhaConta.meses
  const meusDias = minhaConta.dias
  const meuAberto = minhaConta.total

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Financeiro"
        linha={`${pelada.nome} · ${ano}`}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <div className="conteudo">
        {erro && <p className="erro">{erro}</p>}

        {secoes.length > 1 && (
          <div className="passos" style={{ gridTemplateColumns: `repeat(${secoes.length}, minmax(0, 1fr))` }}>
            {secoes.map((item) => (
              <button
                key={item.chave}
                type="button"
                className={item.chave === secaoAtual ? 'passo passo--atual' : 'passo'}
                onClick={() => definirSecao(item.chave)}
              >
                {item.nome}
              </button>
            ))}
          </div>
        )}

        {secaoAtual === 'mensalidades' && (
          <>
            <section className="cartao">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="botao botao--pequeno"
                  aria-label="Mês anterior"
                  onClick={() => definirMes(String(Math.max(1, Number(mes) - 1)).padStart(2, '0'))}
                >
                  ‹
                </button>
                <div style={{ flexGrow: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 26, textTransform: 'uppercase' }}>
                    {nomeDoMes(mes)}
                  </div>
                  <div className="lista__detalhe">
                    {dinheiro(valorMensalidade)} por jogador · goleiro isento não paga
                  </div>
                </div>
                <button
                  type="button"
                  className="botao botao--pequeno"
                  aria-label="Próximo mês"
                  onClick={() => definirMes(String(Math.min(12, Number(mes) + 1)).padStart(2, '0'))}
                >
                  ›
                </button>
              </div>
              <div className="barra">
                <div
                  className="barra__cheio"
                  style={{ width: `${doMes.length ? Math.round((pagosNoMes.length / doMes.length) * 100) : 0}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: 'var(--ok)' }}>
                  {pagosNoMes.length} de {doMes.length} pagaram
                </span>
                <span style={{ color: 'var(--alerta)' }}>
                  falta {dinheiro((doMes.length - pagosNoMes.length) * valorMensalidade)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="botao botao--contorno" style={{ flex: 1 }} onClick={() => marcarMesInteiro(true)}>
                  Todos pagaram
                </button>
                <button type="button" className="botao" style={{ flex: 1 }} onClick={() => marcarMesInteiro(false)}>
                  Desmarcar
                </button>
              </div>
            </section>

            <section className="cartao">
              {doMes.map((linha) => (
                <div key={linha.jogadorId} className="linha">
                  <input
                    type="checkbox"
                    checked={linha.pago}
                    aria-label={`${linha.nome} pagou ${nomeDoMes(mes)}`}
                    onChange={(evento) => marcarMensalidade(linha.jogadorId, evento.target.checked)}
                    style={{ width: 22, height: 22 }}
                  />
                  <span className="linha__nome">{linha.nome}</span>
                  <span className={linha.pago ? 'chip chip--pago' : 'chip chip--deve'}>
                    {linha.pago ? 'pago' : dinheiro(linha.valor)}
                  </span>
                </div>
              ))}
            </section>
          </>
        )}

        {secaoAtual === 'dias' && (
          <section className="cartao">
            <h2 className="titulo-secao">{ehMensal ? 'Domingos do ano' : 'Peladas do ano'}</h2>
            {doAno.length === 0 ? (
              <p className="ajuda">Nenhum dia registrado ainda.</p>
            ) : (
              [...doAno]
                .sort((um, outro) => (outro.data || '').localeCompare(um.data || ''))
                .map((jogo) => {
                  const resumo = resumoDoDinheiroDoJogo(pelada, jogo, jogadores)
                  return (
                    <button
                      key={jogo.id}
                      type="button"
                      className="linha"
                      style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--linha-fina)', cursor: 'pointer' }}
                      onClick={() => irPara(`/p/${peladaId}/j/${jogo.id}`)}
                    >
                      <span className="linha__nome" style={{ textAlign: 'left' }}>
                        {dataCurta(jogo.data)}
                        <span className="lista__detalhe"> · {dinheiro(resumo.total)}</span>
                      </span>
                      <span className={resumo.falta > 0 ? 'chip chip--deve' : 'chip chip--pago'}>
                        {resumo.falta > 0 ? `falta ${dinheiro(resumo.falta)}` : 'quitado'}
                      </span>
                    </button>
                  )
                })
            )}
          </section>
        )}

        {secaoAtual === 'caixa' && (
          <>
            <section className="cartao">
              <h2 className="titulo-secao">Saldo do caixa</h2>
              <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 40 }}>{dinheiro(saldo)}</span>
              <p className="ajuda">
                Entrou {dinheiro(emReais(recebidoMensalidades + recebidoDias + entradasManuais))} · saiu{' '}
                {dinheiro(emReais(saidas))}. O que os jogadores pagaram entra sozinho; aluguel, bola e colete você
                lança aqui.
              </p>
            </section>

            <form className="cartao" onSubmit={guardarLancamento}>
              <h2 className="titulo-secao">Novo lançamento</h2>
              <div className="campo">
                <label htmlFor="descricao">O que foi</label>
                <input
                  id="descricao"
                  value={lancamento.descricao}
                  onChange={(evento) => definirLancamento({ ...lancamento, descricao: evento.target.value })}
                  placeholder="Aluguel do campo"
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="campo" style={{ flex: 1 }}>
                  <label htmlFor="valor">Valor (R$)</label>
                  <input
                    id="valor"
                    inputMode="decimal"
                    value={lancamento.valor}
                    onChange={(evento) => definirLancamento({ ...lancamento, valor: evento.target.value })}
                  />
                </div>
                <div className="campo" style={{ flex: 1 }}>
                  <label htmlFor="data-lancamento">Dia</label>
                  <input
                    id="data-lancamento"
                    type="date"
                    value={lancamento.data}
                    onChange={(evento) => definirLancamento({ ...lancamento, data: evento.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['saida', 'entrada'].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className="botao"
                    style={{
                      flex: 1,
                      ...(lancamento.tipo === tipo ? { background: 'var(--tinta)', color: '#fff', border: 0 } : {}),
                    }}
                    aria-pressed={lancamento.tipo === tipo}
                    onClick={() => definirLancamento({ ...lancamento, tipo })}
                  >
                    {tipo === 'saida' ? 'Saiu dinheiro' : 'Entrou dinheiro'}
                  </button>
                ))}
              </div>
              <button type="submit" className="botao botao--principal">
                Lançar
              </button>
            </form>

            <section className="cartao">
              <h2 className="titulo-secao">Lançamentos</h2>
              {caixa.length === 0 ? (
                <p className="ajuda">Nada lançado ainda.</p>
              ) : (
                [...caixa]
                  .sort((um, outro) => (outro.data || '').localeCompare(um.data || ''))
                  .map((item) => (
                    <div key={item.id} className="linha">
                      <span className="linha__nome">
                        {item.descricao}
                        <span className="lista__detalhe"> · {dataCurta(item.data)}</span>
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: item.tipo === 'entrada' ? 'var(--ok)' : 'var(--alerta)',
                        }}
                      >
                        {item.tipo === 'entrada' ? '+' : '−'} {dinheiro(item.valor)}
                      </span>
                    </div>
                  ))
              )}
            </section>
          </>
        )}

        {secaoAtual === 'meu' && (
          <>
            <section className="cartao">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 className="titulo-secao">Em aberto</h2>
                <span
                  style={{
                    fontFamily: 'var(--titulo)',
                    fontWeight: 800,
                    fontSize: 36,
                    color: meuAberto > 0 ? 'var(--alerta)' : 'var(--ok)',
                  }}
                >
                  {dinheiro(meuAberto)}
                </span>
              </div>
              <p className="ajuda">Só você vê esta tela. Pague pelo Pix abaixo e mande o comprovante no grupo.</p>
            </section>

            {ehMensal && (
              <section className="cartao">
                <h2 className="titulo-secao">Minhas mensalidades de {ano}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {minhasMensalidades.map((item) => (
                    <div
                      key={item.mes}
                      className={
                        item.situacao === 'pago' ? 'chip chip--pago' : item.situacao === 'deve' ? 'chip chip--deve' : 'chip chip--neutro'
                      }
                      style={{ textAlign: 'center', padding: '10px 4px' }}
                    >
                      {nomeDoMes(item.mes).slice(0, 3)}
                      <br />
                      {item.situacao === 'pago' ? 'pago' : item.situacao === 'deve' ? 'deve' : '—'}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="cartao">
              <h2 className="titulo-secao">{ehMensal ? 'Meus domingos' : 'Minhas peladas'}</h2>
              {meusDias.length === 0 ? (
                <p className="ajuda">Nada cobrado de você ainda.</p>
              ) : (
                meusDias.map(({ jogo, valor, pago }) => (
                  <div key={jogo.id} className="linha">
                    <span className="linha__nome">{dataCurta(jogo.data)}</span>
                    <span style={{ fontWeight: 700 }}>{dinheiro(valor)}</span>
                    <span className={pago ? 'chip chip--pago' : 'chip chip--deve'}>{pago ? 'pago' : 'pendente'}</span>
                  </div>
                ))
              )}
            </section>

            {ehMensal && recebedores.length > 0 && (
              <Pix recebedor={recebedores[Number(pelada.config?.recebeMensalidade ?? 0)]} titulo="Mensalidade" />
            )}
            {recebedores.length > 0 && (
              <Pix
                recebedor={
                  recebedores[
                    Number(ehMensal ? (pelada.config?.recebeDomingo ?? 0) : (pelada.config?.recebePelada ?? 0))
                  ]
                }
                titulo={ehMensal ? 'Os R$ 2 dos domingos' : 'Rateio da quadra'}
              />
            )}
          </>
        )}
      </div>
      <Abas peladaId={peladaId} atual="financeiro" ehMensal={ehMensal} />
    </div>
  )
}
