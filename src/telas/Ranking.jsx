import { useState } from 'react'
import Abas from '../componentes/Abas.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { estatisticasDoAno } from '../dados/regras.js'
import { useColecao } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { anoDe, hoje, plural } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

const COLUNAS = [
  { chave: 'gols', nome: 'Gols' },
  { chave: 'assistencias', nome: 'Assist.' },
  { chave: 'jogos', nome: 'Presença' },
  { chave: 'aproveitamento', nome: 'Vitórias' },
]

export default function Ranking({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando } = usePelada(peladaId, usuario)
  const jogos = useColecao(peladaId ? `peladas/${peladaId}/jogos` : null)
  const [coluna, definirColuna] = useState('gols')
  const [ano, definirAno] = useState(null)

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
  const anos = [...new Set(jogos.map((jogo) => anoDe(jogo.data)))].sort((um, outro) => outro - um)
  const anoEscolhido = ano ?? anos[0] ?? anoDe(hoje())
  const colunas = ehMensal ? COLUNAS : COLUNAS.filter((item) => item.chave !== 'aproveitamento')

  const tabela = estatisticasDoAno(jogos, jogadores, anoEscolhido)
    .filter((linha) => linha.jogos > 0 || linha.gols > 0)
    .sort((um, outro) => (outro[coluna] || 0) - (um[coluna] || 0) || outro.gols - um.gols)

  const maior = Math.max(1, ...tabela.map((linha) => linha[coluna] || 0))
  const jogosDoAno = jogos.filter(
    (jogo) => anoDe(jogo.data) === anoEscolhido && jogo.status !== 'cancelado',
  ).length

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Ranking"
        linha={`${pelada.nome} · ${plural(jogosDoAno, ehMensal ? 'domingo' : 'pelada', ehMensal ? 'domingos' : 'peladas')} em ${anoEscolhido}`}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
      />
      <div className="conteudo">
        {anos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Ano">
            {anos.map((umAno) => (
              <button
                key={umAno}
                type="button"
                className="botao botao--pequeno"
                aria-pressed={umAno === anoEscolhido}
                style={umAno === anoEscolhido ? { background: 'var(--tinta)', color: '#fff', border: 0 } : undefined}
                onClick={() => definirAno(umAno)}
              >
                {umAno}
              </button>
            ))}
          </div>
        )}

        <div className="passos" style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))` }}>
          {colunas.map((item) => (
            <button
              key={item.chave}
              type="button"
              className={item.chave === coluna ? 'passo passo--atual' : 'passo'}
              onClick={() => definirColuna(item.chave)}
            >
              {item.nome}
            </button>
          ))}
        </div>

        {tabela.length === 0 ? (
          <p className="ajuda">Ainda não tem número nenhum em {anoEscolhido}.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }} className="cartao">
            {tabela.map((linha, posicao) => (
              <li key={linha.jogadorId} className="linha">
                <span
                  style={{
                    width: 26,
                    fontFamily: 'var(--titulo)',
                    fontWeight: 800,
                    fontSize: 20,
                    color: posicao < 3 ? 'var(--tinta)' : 'var(--suave)',
                  }}
                >
                  {posicao + 1}
                </span>
                <span className="linha__nome" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>
                    {linha.nome}
                    {membro.jogadorId === linha.jogadorId && <span className="lista__detalhe"> · você</span>}
                  </span>
                  <span className="barra" style={{ maxWidth: 160 }}>
                    <span
                      className="barra__cheio"
                      style={{ display: 'block', width: `${Math.round(((linha[coluna] || 0) / maior) * 100)}%` }}
                    />
                  </span>
                  {ehMensal && coluna === 'aproveitamento' && (
                    <span className="lista__detalhe">
                      {linha.vitorias}V · {linha.empates}E · {linha.derrotas}D
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'var(--titulo)', fontWeight: 800, fontSize: 24 }}>
                  {linha[coluna] || 0}
                  {coluna === 'aproveitamento' ? '%' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <Abas peladaId={peladaId} atual="ranking" ehMensal={ehMensal} />
    </div>
  )
}
