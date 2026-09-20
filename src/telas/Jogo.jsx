import { useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { agora, gravar } from '../dados/api.js'
import { resumoDoDinheiroDoJogo } from '../dados/regras.js'
import { useColecao, useDoc } from '../dados/useColecao.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { dataCurta } from '../util/formato.js'
import { irPara } from '../util/rotas.js'
import Chegada from './jogo/Chegada.jsx'
import Dinheiro from './jogo/Dinheiro.jsx'
import Gols from './jogo/Gols.jsx'
import Times from './jogo/Times.jsx'

export default function Jogo({ peladaId, jogoId, usuario }) {
  const { pelada, membro, jogadores, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const jogo = useDoc(peladaId && jogoId ? `peladas/${peladaId}/jogos/${jogoId}` : null)
  const lancamentos = useColecao(peladaId ? `peladas/${peladaId}/lancamentos` : null)
  const [passo, definirPasso] = useState(0)
  const [erro, definirErro] = useState('')
  const [copia, definirCopia] = useState(null)

  const ehMensal = pelada?.cobranca === 'mensal'
  const nomes = ehMensal ? ['Chegada', 'Times', 'Placar', 'R$ 2'] : ['Lista', 'Times', 'Gols', 'Rateio']

  // A tela mostra a cópia recém-alterada até o banco devolver uma versão mais
  // nova. É isso que faz cada toque valer, sem um apagar o do outro nem a tela
  // "voltar no tempo" enquanto a gravação não chega.
  const copiaVale = copia && copia.id === jogo?.id && (copia.atualizadoEm || '') >= (jogo?.atualizadoEm || '')
  const jogoAtual = copiaVale ? copia : jogo

  async function salvar(camposOuFuncao) {
    const base = jogoAtual || {}
    const campos = typeof camposOuFuncao === 'function' ? camposOuFuncao(base) : camposOuFuncao
    const momento = agora()
    definirCopia({ ...base, ...campos, atualizadoEm: momento })
    try {
      await gravar(`peladas/${peladaId}/jogos/${jogoId}`, { ...campos, atualizadoEm: momento })
      definirErro('')
    } catch {
      definirErro('Não consegui salvar. Só a diretoria edita o dia de jogo.')
      definirCopia(null)
    }
  }

  if (carregando || jogo === null) {
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

  const resumo = resumoDoDinheiroDoJogo(pelada, jogoAtual, jogadores)
  const feitos = [
    (jogoAtual.lista || []).length > 0,
    (jogoAtual.times || []).length > 0,
    ehMensal ? Boolean(jogoAtual.placar) : Object.keys(jogoAtual.gols || {}).length > 0,
    resumo.quantidade > 0 && resumo.falta === 0,
  ]

  const comuns = { peladaId, pelada, jogo: jogoAtual, jogadores, ehDiretoria, salvar, membro }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo={dataCurta(jogoAtual.data)}
        linha={pelada.nome}
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
        {erro && <p className="erro">{erro}</p>}

        {jogoAtual.status === 'cancelado' && (
          <div className="cartao cartao--aviso">
            <strong>Dia cancelado.</strong> Ninguém paga por este dia. Ele continua no histórico.
          </div>
        )}

        {ehDiretoria && (
          <section className="cartao">
            <div className="campo">
              <label htmlFor="data-do-jogo">Data</label>
              <input
                id="data-do-jogo"
                type="date"
                value={jogoAtual.data || ''}
                onChange={(evento) => salvar({ data: evento.target.value })}
              />
            </div>
            <button
              type="button"
              className={jogoAtual.status === 'cancelado' ? 'botao botao--contorno' : 'botao botao--perigo'}
              onClick={() => salvar({ status: jogoAtual.status === 'cancelado' ? 'aberto' : 'cancelado' })}
            >
              {jogoAtual.status === 'cancelado' ? 'Reabrir este dia' : 'Cancelar este dia (chuva, feriado)'}
            </button>
          </section>
        )}

        {passo === 0 && <Chegada {...comuns} />}
        {passo === 1 && <Times {...comuns} />}
        {passo === 2 && <Gols {...comuns} lancamentos={lancamentos} />}
        {passo === 3 && <Dinheiro {...comuns} />}

        <div style={{ display: 'flex', gap: 10 }}>
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
            {passo === 3 ? 'Terminar' : `Ir pra ${nomes[passo + 1]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
