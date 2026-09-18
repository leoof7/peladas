import { useEffect, useState } from 'react'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { assinarColecao, assinarDoc } from '../dados/api.js'
import { entrarNaPelada } from '../dados/pelada.js'
import { pinValido } from '../util/pin.js'
import { irPara } from '../util/rotas.js'

function semAcento(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function Entrar({ peladaId, usuario }) {
  const [pelada, definirPelada] = useState(undefined)
  const [jogadores, definirJogadores] = useState([])
  const [codigo, definirCodigo] = useState('')
  const [busca, definirBusca] = useState('')
  const [jogadorId, definirJogadorId] = useState('')
  const [pin, definirPin] = useState('')
  const [erro, definirErro] = useState('')
  const [entrando, definirEntrando] = useState(false)

  useEffect(() => {
    const assinaturas = [
      assinarDoc(`peladas/${peladaId}`, definirPelada, () => definirPelada(null)),
      assinarColecao(`peladas/${peladaId}/jogadores`, definirJogadores, () => definirJogadores([])),
    ]
    return () => assinaturas.forEach((cancelar) => cancelar())
  }, [peladaId])

  const ativos = jogadores
    .filter((jogador) => jogador.ativo !== false)
    .filter((jogador) => !busca.trim() || semAcento(jogador.nome || '').includes(semAcento(busca.trim())))
    .sort((um, outro) => (um.nome || '').localeCompare(outro.nome || '', 'pt-BR'))

  const podeEntrar = codigo.trim().length >= 4 && jogadorId && pinValido(pin)

  async function confirmar(evento) {
    evento.preventDefault()
    if (!podeEntrar || entrando) return
    definirEntrando(true)
    definirErro('')
    try {
      await entrarNaPelada({ peladaId, codigo, jogadorId, pin, usuario })
      irPara(`/p/${peladaId}`)
    } catch (falha) {
      definirErro(falha.message || 'Não consegui entrar.')
      definirEntrando(false)
    }
  }

  if (pelada === null) {
    return (
      <div className="app">
        <Cabecalho titulo="Pelada não encontrada" aoVoltar={() => irPara('/')} />
        <div className="conteudo">
          <p className="erro">Não achei nenhuma pelada nesse endereço. Confira o link com a diretoria.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Cabecalho
        titulo={pelada?.nome || 'Entrar'}
        linha={pelada ? `${pelada.local} · ${pelada.cobranca === 'mensal' ? 'mensalidade' : 'rateio por pelada'}` : 'carregando…'}
        aoVoltar={() => irPara('/')}
      />
      <form className="conteudo" onSubmit={confirmar}>
        <AvisoModoTeste />
        {erro && <p className="erro">{erro}</p>}

        <div className="campo">
          <label htmlFor="codigo">1. Código da pelada</label>
          <input
            id="codigo"
            className="codigo"
            value={codigo}
            onChange={(evento) => definirCodigo(evento.target.value.toUpperCase().slice(0, 12))}
            autoComplete="off"
            placeholder="ABC123"
          />
          <p className="ajuda">A diretoria passa esse código no grupo. Quem é da diretoria usa o código dela.</p>
        </div>

        <div className="campo">
          <label htmlFor="busca">2. Quem é você?</label>
          <input
            id="busca"
            value={busca}
            onChange={(evento) => definirBusca(evento.target.value)}
            placeholder="Buscar seu nome"
            autoComplete="off"
          />
        </div>

        {ativos.length === 0 ? (
          <p className="ajuda">
            Nenhum jogador cadastrado ainda com esse nome. Peça pra diretoria te cadastrar.
          </p>
        ) : (
          <ul className="lista">
            {ativos.slice(0, 12).map((jogador) => (
              <li key={jogador.id}>
                <button
                  type="button"
                  className="lista__item"
                  aria-pressed={jogadorId === jogador.id}
                  onClick={() => definirJogadorId(jogador.id)}
                >
                  <span className="lista__textos">
                    <span className="lista__nome">{jogador.nome}</span>
                    {jogador.apelido && <span className="lista__detalhe">{jogador.apelido}</span>}
                  </span>
                  {jogadorId === jogador.id && <span className="selo">você</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="campo">
          <label htmlFor="pin">3. Seu PIN de 4 números</label>
          <input
            id="pin"
            className="codigo"
            value={pin}
            onChange={(evento) => definirPin(evento.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
          />
          <p className="ajuda">
            Primeiro acesso? O PIN que você digitar agora vira o seu. Esqueceu? A diretoria zera pra você.
          </p>
        </div>

        <button type="submit" className="botao botao--principal" disabled={!podeEntrar || entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
