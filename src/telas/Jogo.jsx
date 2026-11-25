import { useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { agora, gravar, gravarLote } from '../dados/api.js'
import { presentes, resumoDoDinheiroDoJogo } from '../dados/regras.js'
import { useColecao, useDoc } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { dataCurta, hoje } from '../util/formato.js'
import { irPara } from '../util/rotas.js'
import Chegada from './jogo/Chegada.jsx'
import Dinheiro from './jogo/Dinheiro.jsx'
import Gols from './jogo/Gols.jsx'
import Times from './jogo/Times.jsx'

export default function Jogo({ peladaId, jogoId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const jogo = useDoc(peladaId && jogoId ? `peladas/${peladaId}/jogos/${jogoId}` : null, 'carregando')
  const lancamentos = useColecao(peladaId ? `peladas/${peladaId}/lancamentos` : null)
  const [passo, definirPasso] = useState(0)
  const [erro, definirErro] = useState('')
  const [pendentes, definirPendentes] = useState(0)
  const [salvo, definirSalvo] = useState(false)
  const [confirmarCancelamento, definirConfirmarCancelamento] = useState(false)
  const [copia, definirCopia] = useState(null)

  const ehMensal = pelada?.cobranca === 'mensal'
  const nomes = ehMensal ? ['Chegada', 'Times', 'Placar', 'Pagamentos'] : ['Chegada', 'Times', 'Gols', 'Pagamentos']

  // A tela mostra a cópia recém-alterada até o banco devolver uma versão mais
  // nova. É isso que faz cada toque valer, sem um apagar o do outro nem a tela
  // "voltar no tempo" enquanto a gravação não chega.
  const copiaVale = copia && copia.id === jogo?.id && (copia.atualizadoEm || '') >= (jogo?.atualizadoEm || '')
  const jogoAtual = copiaVale ? copia : jogo

  async function salvar(camposOuFuncao, outros = []) {
    if (!ehDiretoria) return false
    definirPendentes((n) => n + 1)
    const base = jogoAtual || {}
    const campos = typeof camposOuFuncao === 'function' ? camposOuFuncao(base) : camposOuFuncao
    const momento = agora()
    definirCopia({ ...base, ...campos, atualizadoEm: momento })
    try {
      const caminho = `peladas/${peladaId}/jogos/${jogoId}`
      const dados = { ...campos, atualizadoEm: momento }
      if (outros.length) await gravarLote([...outros, { caminho, dados }])
      else await gravar(caminho, dados)
      definirErro('')
      definirSalvo(true)
      // Gravou: solta a cópia pra tela voltar a seguir o banco ao vivo,
      // inclusive quando outro diretor mexer no mesmo dia.
      definirCopia((atual) => (atual?.atualizadoEm === momento ? null : atual))
      return true
    } catch {
      definirErro('Não consegui salvar. Só a diretoria edita o dia de jogo.')
      definirCopia((atual) => atual?.atualizadoEm === momento ? null : atual)
      return false
    } finally {
      definirPendentes((n) => n - 1)
    }
  }

  if (carregando || jogo === 'carregando') {
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

  if (!jogoAtual || !pelada) return (
    <div className="app">
      <Cabecalho titulo="Jogo indisponível" aoVoltar={() => irPara(`/p/${peladaId}/jogos`)} />
      <main className="conteudo"><p className="cartao">Não foi possível abrir este jogo.</p>
        <button className="botao botao--principal" onClick={() => irPara(`/p/${peladaId}/jogos`)}>Ver histórico de jogos</button>
      </main>
    </div>
  )

  const cancelado = jogoAtual.status === 'cancelado'
  const historico = jogoAtual.data < hoje()

  const resumo = resumoDoDinheiroDoJogo(pelada, jogoAtual, jogadores)
  const feitos = [
    presentes(jogoAtual).length > 0,
    (jogoAtual.times || []).length > 0,
    ehMensal ? Boolean(jogoAtual.placar) : Object.keys(jogoAtual.gols || {}).length > 0,
    resumo.quantidade > 0 && resumo.falta === 0,
  ]

  const comuns = { peladaId, pelada, jogo: jogoAtual, jogadores, ehDiretoria: ehDiretoria && !cancelado, salvar, membro }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo={dataCurta(jogoAtual.data)}
        linha={`${pelada.nome} · ${historico ? 'Histórico' : 'Dia de jogo'}`}
        aoVoltar={() => irPara(`/p/${peladaId}/jogos`)}
        selo={ehDiretoria ? 'Diretoria' : 'Participante'}
      />
      <nav className="passos" aria-label="Etapas do dia">
        {nomes.map((nome, indice) => (
          <button
            key={nome}
            type="button"
            className={`passo${indice === passo ? ' passo--atual' : feitos[indice] ? ' passo--feito' : ''}`}
            aria-current={indice === passo ? 'step' : undefined}
            onClick={() => definirPasso(indice)}
          >
            {indice + 1} {nome}
          </button>
        ))}
      </nav>

      <div className="conteudo">
        {erro && <p className="erro" role="alert">{erro}</p>}
        {ehDiretoria && (pendentes > 0 || (salvo && !erro)) && (
          <p className="ajuda estado-gravacao" role="status">{pendentes ? 'Salvando…' : 'Alterações salvas'}</p>
        )}

        {jogoAtual.status === 'cancelado' && (
          <div className="cartao cartao--aviso">
            <strong>Dia cancelado.</strong> Ninguém paga por este dia. Ele continua no histórico.
          </div>
        )}

        {ehDiretoria && (
          <details className="cartao painel-recolhivel">
            <summary>Opções do jogo</summary>
            <div className="campo">
              <label htmlFor="data-do-jogo">Data</label>
              <input id="data-do-jogo" type="date" value={jogoAtual.data || ''}
                onChange={(evento) => { if (evento.target.value) salvar({ data: evento.target.value }) }} />
            </div>
            {cancelado ? <button type="button" className="botao" onClick={() => salvar({ status: 'aberto' })}>Reabrir jogo</button>
              : confirmarCancelamento ? <div className="acoes-times">
                <button type="button" className="botao" onClick={() => definirConfirmarCancelamento(false)}>Manter jogo</button>
                <button type="button" className="botao botao--perigo" onClick={async () => {
                  if (await salvar({ status: 'cancelado' })) definirConfirmarCancelamento(false)
                }}>Confirmar cancelamento</button>
              </div> : <button type="button" className="botao botao--perigo" onClick={() => definirConfirmarCancelamento(true)}>Cancelar jogo</button>}
          </details>
        )}

        <h2 className="etapa-titulo">{nomes[passo]}</h2>
        {passo === 0 && <Chegada {...comuns} />}
        {passo === 1 && <Times {...comuns} />}
        {passo === 2 && <Gols {...comuns} lancamentos={lancamentos} />}
        {passo === 3 && <Dinheiro {...comuns} />}

        <div className="acoes-etapa">
          <button
            type="button"
            className="botao"
            style={{ flex: 1 }}
            onClick={() => definirPasso(Math.max(0, passo - 1))}
            disabled={passo === 0}
          >
            Voltar
          </button>
          <button
            type="button"
            className="botao botao--principal"
            style={{ flex: 1 }}
            onClick={() => (passo === 3 ? irPara(`/p/${peladaId}`) : definirPasso(passo + 1))}
          >
            {passo === 3 ? 'Voltar à pelada' : `Ir para ${nomes[passo + 1]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
