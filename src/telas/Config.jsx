import { useEffect, useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { assinarDoc, gravar } from '../dados/api.js'
import { gerarCodigo } from '../dados/pelada.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { irPara } from '../util/rotas.js'

export default function Config({ peladaId, usuario }) {
  const { pelada, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [codigos, definirCodigos] = useState(null)
  const [rascunho, definirRascunho] = useState(null)
  const [recado, definirRecado] = useState('')
  const [erro, definirErro] = useState('')

  useEffect(() => {
    if (!ehDiretoria) return undefined
    return assinarDoc(`peladas/${peladaId}/privado/codigos`, definirCodigos, () => definirCodigos(null))
  }, [peladaId, ehDiretoria])

  // Enquanto ninguém editou nada, os campos mostram o que está salvo.
  const valores = rascunho ?? (pelada ? { nome: pelada.nome, config: { ...pelada.config } } : null)

  if (carregando || !valores) {
    return (
      <div className="app">
        <div className="conteudo">
          <p className="ajuda">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!ehDiretoria) {
    return (
      <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
        <Cabecalho titulo="Configurações" aoVoltar={() => irPara(`/p/${peladaId}`)} />
        <div className="conteudo">
          <p className="erro">Só a diretoria pode mexer aqui.</p>
        </div>
      </div>
    )
  }

  const ehMensal = pelada.cobranca === 'mensal'

  function mudarConfig(chave, valor) {
    definirRascunho({ ...valores, config: { ...valores.config, [chave]: valor } })
  }

  function mudarUniforme(indice, campo, valor) {
    const uniformes = [...(valores.config.uniformes || [])]
    uniformes[indice] = { ...uniformes[indice], [campo]: valor }
    mudarConfig('uniformes', uniformes)
  }

  async function salvar(evento) {
    evento.preventDefault()
    try {
      await gravar(`peladas/${peladaId}`, { nome: valores.nome.trim(), config: valores.config })
      definirRecado('Salvo.')
      definirErro('')
      setTimeout(() => definirRecado(''), 2000)
    } catch {
      definirErro('Não consegui salvar.')
    }
  }

  async function trocarCodigo(qual) {
    try {
      await gravar(`peladas/${peladaId}/privado/codigos`, { [qual]: gerarCodigo() })
      definirErro('')
    } catch {
      definirErro('Não consegui trocar o código.')
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto)
      definirRecado('Copiado.')
      setTimeout(() => definirRecado(''), 2000)
    } catch {
      definirErro('O aparelho não deixou copiar. Anote na mão.')
    }
  }

  return (
    <div className="app" style={{ '--destaque': corDaPelada(pelada) }}>
      <Cabecalho
        titulo="Configurações"
        linha={pelada.nome}
        aoVoltar={() => irPara(`/p/${peladaId}`)}
        selo="Diretoria"
      />
      <form className="conteudo" onSubmit={salvar}>
        {erro && <p className="erro">{erro}</p>}
        {recado && <p className="ajuda centro">{recado}</p>}

        <div className="cartao">
          <h2 className="titulo-secao">Grupo</h2>
          <div className="campo">
            <label htmlFor="nome-pelada">Nome</label>
            <input
              id="nome-pelada"
              value={valores.nome}
              onChange={(evento) => definirRascunho({ ...valores, nome: evento.target.value })}
            />
          </div>
          <p className="ajuda">
            {pelada.local} · {ehMensal ? 'cobrança mensal' : 'rateio por pelada'}. Isso é fixo desta pelada.
          </p>
        </div>

        <div className="cartao">
          <h2 className="titulo-secao">Cobrança</h2>
          {ehMensal ? (
            <>
              <div className="campo">
                <label htmlFor="mensalidade">Mensalidade (R$)</label>
                <input
                  id="mensalidade"
                  type="number"
                  min="0"
                  step="0.01"
                  value={valores.config.mensalidade ?? 0}
                  onChange={(evento) => mudarConfig('mensalidade', Number(evento.target.value))}
                />
              </div>
              <div className="campo">
                <label htmlFor="derrota">Perdeu ou empatou (R$ por jogador)</label>
                <input
                  id="derrota"
                  type="number"
                  min="0"
                  step="0.01"
                  value={valores.config.valorDerrota ?? 0}
                  onChange={(evento) => mudarConfig('valorDerrota', Number(evento.target.value))}
                />
              </div>
              <div className="campo">
                <label htmlFor="jogam">Quantos jogam por domingo</label>
                <input
                  id="jogam"
                  type="number"
                  min="2"
                  step="1"
                  value={valores.config.jogamPorDia ?? 22}
                  onChange={(evento) => mudarConfig('jogamPorDia', Number(evento.target.value))}
                />
                <p className="ajuda">Quem passar disso entra no 2º tempo, por ordem de chegada.</p>
              </div>
            </>
          ) : (
            <>
              <div className="campo">
                <label htmlFor="aluguel">Aluguel da quadra (R$)</label>
                <input
                  id="aluguel"
                  type="number"
                  min="0"
                  step="0.01"
                  value={valores.config.valorAluguel ?? 0}
                  onChange={(evento) => mudarConfig('valorAluguel', Number(evento.target.value))}
                />
                <p className="ajuda">Valor de sempre. Dá pra mudar em cada pelada, quando a quadra for outra.</p>
              </div>
              <div className="campo">
                <label htmlFor="vagas">Limite de vagas</label>
                <input
                  id="vagas"
                  type="number"
                  min="2"
                  step="1"
                  value={valores.config.limiteVagas ?? 20}
                  onChange={(evento) => mudarConfig('limiteVagas', Number(evento.target.value))}
                />
              </div>
              <div className="campo">
                <label htmlFor="linha">Na linha por time</label>
                <input
                  id="linha"
                  type="number"
                  min="3"
                  step="1"
                  value={valores.config.naLinhaPorTime ?? 5}
                  onChange={(evento) => mudarConfig('naLinhaPorTime', Number(evento.target.value))}
                />
              </div>
            </>
          )}
        </div>

        {ehMensal && (
          <div className="cartao">
            <h2 className="titulo-secao">Uniformes</h2>
            <p className="ajuda">As cores que o pessoal usa. Em cada domingo a diretoria escolhe qual time usa qual.</p>
            {(valores.config.uniformes || []).map((uniforme, indice) => (
              <div key={indice} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  aria-label={`Cor do uniforme ${indice + 1}`}
                  type="color"
                  value={uniforme.cor || '#1e6b3c'}
                  onChange={(evento) => mudarUniforme(indice, 'cor', evento.target.value)}
                  style={{ width: 52, height: 44, border: '1px solid #d6d0c3', borderRadius: 10, padding: 4 }}
                />
                <input
                  aria-label={`Nome do uniforme ${indice + 1}`}
                  value={uniforme.nome || ''}
                  onChange={(evento) => mudarUniforme(indice, 'nome', evento.target.value)}
                  style={{ flexGrow: 1, height: 44, border: '1px solid #d6d0c3', borderRadius: 10, padding: '0 12px' }}
                />
                <button
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() =>
                    mudarConfig(
                      'uniformes',
                      valores.config.uniformes.filter((_, outro) => outro !== indice),
                    )
                  }
                >
                  Tirar
                </button>
              </div>
            ))}
            <button
              type="button"
              className="botao botao--pequeno"
              onClick={() => mudarConfig('uniformes', [...(valores.config.uniformes || []), { nome: '', cor: '#1e6b3c' }])}
            >
              Adicionar uniforme
            </button>
          </div>
        )}

        <div className="cartao">
          <h2 className="titulo-secao">Acesso</h2>
          <p className="ajuda">
            O código dos jogadores é o que você manda no grupo. O da diretoria é só de quem edita o app.
          </p>
          {['participante', 'diretoria'].map((qual) => (
            <div key={qual} className="campo">
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {qual === 'participante' ? 'Código dos jogadores' : 'Código da diretoria'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="codigo" style={{ flexGrow: 1, fontSize: 22 }}>
                  {codigos?.[qual] || '······'}
                </span>
                <button
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() => copiar(codigos?.[qual] || '')}
                  disabled={!codigos?.[qual]}
                >
                  Copiar
                </button>
                <button type="button" className="botao botao--pequeno" onClick={() => trocarCodigo(qual)}>
                  Trocar
                </button>
              </div>
            </div>
          ))}
          <p className="ajuda">
            Trocou o código? Quem já entrou continua entrando. O código novo vale pra quem for entrar daqui pra
            frente.
          </p>
        </div>

        <button type="submit" className="botao botao--principal">
          Salvar
        </button>
      </form>
    </div>
  )
}
