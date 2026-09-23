import { useState } from 'react'
import Abas from '../componentes/Abas.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { agora, gravar, novoId } from '../dados/api.js'
import { presentes, resumoDoDinheiroDoJogo } from '../dados/regras.js'
import { useColecao } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { anoDe, dataCurta, hoje, plural, proximoDomingo } from '../util/formato.js'
import { irPara } from '../util/rotas.js'

export default function Jogos({ peladaId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const jogos = useColecao(peladaId ? `peladas/${peladaId}/jogos` : null)
  const [criando, definirCriando] = useState(false)
  const [erro, definirErro] = useState('')

  const ehMensal = pelada?.cobranca === 'mensal'
  const ordenados = [...jogos].sort((um, outro) => (outro.data || '').localeCompare(um.data || ''))
  const anos = [...new Set(ordenados.map((jogo) => anoDe(jogo.data)))]
  const [ano, definirAno] = useState(null)
  const anoEscolhido = ano ?? anos[0] ?? anoDe(hoje())
  const doAno = ordenados.filter((jogo) => anoDe(jogo.data) === anoEscolhido)

  async function novoJogo() {
    if (criando) return
    definirCriando(true)
    const data = ehMensal ? proximoDomingo() : hoje()
    const jogoId = novoId()
    try {
      await gravar(
        `peladas/${peladaId}/jogos/${jogoId}`,
        {
          data,
          status: 'aberto',
          lista: [],
          times: [],
          gols: {},
          assistencias: {},
          pagamentos: {},
          custo: ehMensal ? 0 : Number(pelada?.config?.valorAluguel || 0),
          criadoEm: agora(),
        },
        { mesclar: false },
      )
      irPara(`/p/${peladaId}/j/${jogoId}`)
    } catch {
      definirErro('Não consegui criar. Só a diretoria abre um dia de jogo.')
      definirCriando(false)
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

  if (!membro) {
    irPara(`/p/${peladaId}/entrar`)
    return null
  }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo={ehMensal ? 'Domingos' : 'Peladas'}
        linha={pelada.nome}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <div className="conteudo">
        {erro && <p className="erro">{erro}</p>}

        {ehDiretoria && (
          <button type="button" className="botao botao--principal" onClick={novoJogo} disabled={criando}>
            {criando ? 'Abrindo…' : ehMensal ? 'Abrir o domingo' : 'Abrir uma pelada'}
          </button>
        )}

        {anos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Ano">
            {anos.map((umAno) => (
              <button
                key={umAno}
                type="button"
                className="botao botao--pequeno"
                aria-pressed={umAno === anoEscolhido}
                style={
                  umAno === anoEscolhido
                    ? { background: 'var(--tinta)', color: '#fff', border: 0 }
                    : undefined
                }
                onClick={() => definirAno(umAno)}
              >
                {umAno}
              </button>
            ))}
          </div>
        )}

        {doAno.length === 0 ? (
          <p className="ajuda">
            Nenhum {ehMensal ? 'domingo' : 'jogo'} registrado ainda
            {ehDiretoria ? '. Abra o primeiro no botão acima.' : '.'}
          </p>
        ) : (
          <ul className="lista">
            {doAno.map((jogo) => {
              const resumo = resumoDoDinheiroDoJogo(pelada, jogo, jogadores)
              const cancelado = jogo.status === 'cancelado'
              const placar = jogo.times?.length === 2 && jogo.placar ? jogo.placar.join(' × ') : null
              return (
                <li key={jogo.id}>
                  <button
                    type="button"
                    className="lista__item"
                    onClick={() => irPara(`/p/${peladaId}/j/${jogo.id}`)}
                  >
                    <span className="lista__textos">
                      <span className="lista__nome">{dataCurta(jogo.data)}</span>
                      <span className="lista__detalhe">
                        {cancelado
                          ? 'cancelado'
                          : [
                              plural(presentes(jogo).length, 'jogou', 'jogaram'),
                              placar,
                              resumo.falta > 0 ? `falta receber R$ ${resumo.falta.toFixed(2)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                      </span>
                    </span>
                    {!cancelado && resumo.quantidade > 0 && (
                      <span className={resumo.falta > 0 ? 'chip chip--deve' : 'chip chip--pago'}>
                        {resumo.falta > 0 ? 'em aberto' : 'quitado'}
                      </span>
                    )}
                    <span aria-hidden="true">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <Abas peladaId={peladaId} atual="jogos" ehMensal={ehMensal} />
    </div>
  )
}
