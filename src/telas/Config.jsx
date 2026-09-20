import { useEffect, useState } from 'react'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { assinarDoc, gravar } from '../dados/api.js'
import { gerarCodigo } from '../dados/pelada.js'
import { corDaPelada, usePelada } from '../dados/usePelada.js'
import { irPara } from '../util/rotas.js'

const CAMPOS_NUMERICOS = [
  'mensalidade',
  'valorDerrota',
  'jogamPorDia',
  'valorAluguel',
  'limiteVagas',
  'naLinhaPorTime',
]

// Aceita o jeito brasileiro de escrever: 60, 60,00 ou 1.200,50.
function paraNumero(valor) {
  if (typeof valor === 'number') return valor
  const texto = String(valor ?? '').trim()
  if (!texto) return 0
  const limpo = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
  const numero = Number(limpo)
  return Number.isFinite(numero) ? numero : NaN
}

export default function Config({ peladaId, usuario }) {
  const { pelada, carregando, ehDiretoria } = usePelada(peladaId, usuario)
  const [codigos, definirCodigos] = useState(null)
  const [codigosRascunho, definirCodigosRascunho] = useState(null)
  const [rascunho, definirRascunho] = useState(null)
  const [recado, definirRecado] = useState('')
  const [erro, definirErro] = useState('')
  const [situacao, definirSituacao] = useState('parado')

  useEffect(() => {
    if (!ehDiretoria) return undefined
    return assinarDoc(`peladas/${peladaId}/privado/codigos`, definirCodigos, () => definirCodigos(null))
  }, [peladaId, ehDiretoria])

  // Enquanto ninguém editou nada, os campos mostram o que está salvo.
  const valores = rascunho ?? (pelada ? { nome: pelada.nome, config: { ...pelada.config } } : null)
  const codigosAtuais = codigosRascunho ?? { participante: codigos?.participante || '', diretoria: codigos?.diretoria || '' }

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

  function mudarRecebedor(indice, campos) {
    const lista = [...(valores.config.recebedores || [])]
    lista[indice] = { ...lista[indice], ...campos }
    mudarConfig('recebedores', lista)
  }

  function mudarCodigo(qual, texto) {
    const limpo = texto
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12)
    definirCodigosRascunho({ ...codigosAtuais, [qual]: limpo })
  }

  function problemaNosCodigos() {
    if (!codigosRascunho) return ''
    const { participante, diretoria } = codigosAtuais
    if ((participante || '').length < 4 || (diretoria || '').length < 4) {
      return 'Cada código precisa ter pelo menos 4 letras ou números.'
    }
    if (participante === diretoria) {
      return 'O código dos jogadores e o da diretoria precisam ser diferentes.'
    }
    return ''
  }

  async function salvar(evento) {
    evento.preventDefault()
    if (situacao === 'salvando') return

    const problema = problemaNosCodigos()
    if (problema) {
      definirErro(problema)
      return
    }

    const config = { ...valores.config }
    for (const chave of CAMPOS_NUMERICOS) {
      if (chave in config) config[chave] = paraNumero(config[chave])
    }
    if (CAMPOS_NUMERICOS.some((chave) => chave in config && Number.isNaN(config[chave]))) {
      definirErro('Confira os valores: use só números, como 60 ou 12,50.')
      return
    }

    definirSituacao('salvando')
    try {
      await gravar(`peladas/${peladaId}`, { nome: valores.nome.trim(), config })
      if (codigosRascunho) {
        await gravar(`peladas/${peladaId}/privado/codigos`, {
          participante: codigosAtuais.participante,
          diretoria: codigosAtuais.diretoria,
        })
        definirCodigosRascunho(null)
      }
      definirErro('')
      definirSituacao('salvo')
      // Mostra o "Salvo" e volta pra tela da pelada.
      setTimeout(() => irPara(`/p/${peladaId}`), 900)
    } catch (falha) {
      definirSituacao('parado')
      definirErro(
        falha?.code === 'permission-denied'
          ? 'O servidor recusou: só a diretoria pode salvar aqui.'
          : 'Não consegui salvar. Confira a internet e tente de novo.',
      )
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
                  inputMode="decimal"
                  value={valores.config.mensalidade ?? ''}
                  onChange={(evento) => mudarConfig('mensalidade', evento.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="derrota">Perdeu ou empatou (R$ por jogador)</label>
                <input
                  id="derrota"
                  inputMode="decimal"
                  value={valores.config.valorDerrota ?? ''}
                  onChange={(evento) => mudarConfig('valorDerrota', evento.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="jogam">Quantos jogam por domingo</label>
                <input
                  id="jogam"
                  inputMode="decimal"
                  value={valores.config.jogamPorDia ?? ''}
                  onChange={(evento) => mudarConfig('jogamPorDia', evento.target.value)}
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
                  inputMode="decimal"
                  value={valores.config.valorAluguel ?? ''}
                  onChange={(evento) => mudarConfig('valorAluguel', evento.target.value)}
                />
                <p className="ajuda">Valor de sempre. Dá pra mudar em cada pelada, quando a quadra for outra.</p>
              </div>
              <div className="campo">
                <label htmlFor="vagas">Limite de vagas</label>
                <input
                  id="vagas"
                  inputMode="decimal"
                  value={valores.config.limiteVagas ?? ''}
                  onChange={(evento) => mudarConfig('limiteVagas', evento.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="linha">Na linha por time</label>
                <input
                  id="linha"
                  inputMode="decimal"
                  value={valores.config.naLinhaPorTime ?? ''}
                  onChange={(evento) => mudarConfig('naLinhaPorTime', evento.target.value)}
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
          <h2 className="titulo-secao">Quem recebe o Pix</h2>
          <p className="ajuda">
            Sem QR Code: o app mostra a chave e todo mundo copia. Só a diretoria edita.
          </p>
          {(valores.config.recebedores || []).map((pessoa, indice) => (
            <div key={indice} className="cartao" style={{ background: 'var(--chao)', border: 0, padding: 12 }}>
              <div className="campo">
                <label htmlFor={`recebedor-nome-${indice}`}>Nome</label>
                <input
                  id={`recebedor-nome-${indice}`}
                  value={pessoa.nome || ''}
                  onChange={(evento) => mudarRecebedor(indice, { nome: evento.target.value })}
                  placeholder="Zé Luiz"
                />
              </div>
              <div className="campo">
                <label htmlFor={`recebedor-tipo-${indice}`}>Tipo da chave</label>
                <select
                  id={`recebedor-tipo-${indice}`}
                  value={pessoa.tipoChave || 'Celular'}
                  onChange={(evento) => mudarRecebedor(indice, { tipoChave: evento.target.value })}
                >
                  {['Celular', 'CPF', 'CNPJ', 'E-mail', 'Chave aleatória'].map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor={`recebedor-chave-${indice}`}>Chave Pix</label>
                <input
                  id={`recebedor-chave-${indice}`}
                  value={pessoa.chave || ''}
                  onChange={(evento) => mudarRecebedor(indice, { chave: evento.target.value })}
                  placeholder="(31) 90000-0000"
                />
              </div>
              <button
                type="button"
                className="botao botao--pequeno"
                onClick={() =>
                  mudarConfig(
                    'recebedores',
                    (valores.config.recebedores || []).filter((_, outro) => outro !== indice),
                  )
                }
              >
                Tirar {pessoa.nome || 'este'}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="botao botao--pequeno"
            onClick={() =>
              mudarConfig('recebedores', [
                ...(valores.config.recebedores || []),
                { nome: '', tipoChave: 'Celular', chave: '' },
              ])
            }
          >
            + Adicionar quem recebe
          </button>

          {(valores.config.recebedores || []).length > 0 &&
            (ehMensal
              ? [
                  { campo: 'recebeMensalidade', nome: 'Quem recebe a mensalidade' },
                  { campo: 'recebeDomingo', nome: 'Quem recebe os R$ 2 dos domingos' },
                ]
              : [{ campo: 'recebePelada', nome: 'Quem recebe o rateio, normalmente' }]
            ).map((item) => (
              <div className="campo" key={item.campo}>
                <label htmlFor={item.campo}>{item.nome}</label>
                <select
                  id={item.campo}
                  value={String(valores.config[item.campo] ?? 0)}
                  onChange={(evento) => mudarConfig(item.campo, Number(evento.target.value))}
                >
                  {(valores.config.recebedores || []).map((pessoa, indice) => (
                    <option key={indice} value={indice}>
                      {pessoa.nome || `Pessoa ${indice + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>

        <div className="cartao">
          <h2 className="titulo-secao">Acesso</h2>
          <p className="ajuda">
            O código dos jogadores é o que você manda no grupo. O da diretoria é só de quem edita o app.
          </p>
          {['participante', 'diretoria'].map((qual) => (
            <div key={qual} className="campo">
              <label htmlFor={`codigo-${qual}`}>
                {qual === 'participante' ? 'Código dos jogadores' : 'Código da diretoria'}
              </label>
              <input
                id={`codigo-${qual}`}
                className="codigo"
                value={codigosAtuais[qual]}
                onChange={(evento) => mudarCodigo(qual, evento.target.value)}
                autoComplete="off"
                inputMode="text"
                placeholder="MADRUGA26"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() => copiar(codigosAtuais[qual])}
                  disabled={!codigosAtuais[qual]}
                  style={{ flex: 1 }}
                >
                  Copiar
                </button>
                <button
                  type="button"
                  className="botao botao--pequeno"
                  onClick={() => mudarCodigo(qual, gerarCodigo())}
                  style={{ flex: 1 }}
                >
                  Sortear
                </button>
              </div>
            </div>
          ))}
          <p className="ajuda">
            Escreva o código que quiser, de 4 a 12 letras e números, sem espaço nem acento. Os dois precisam ser
            diferentes um do outro. Quem já entrou continua entrando; o código novo vale pra quem for entrar
            daqui pra frente.
          </p>
        </div>

        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao botao--principal" disabled={situacao === 'salvando'}>
          {situacao === 'salvando' ? 'Salvando…' : situacao === 'salvo' ? 'Salvo ✓' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
