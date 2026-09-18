import { useEffect, useState } from 'react'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { lerDoc } from '../dados/api.js'
import { apelidoDoEndereco, peladasDoCelular } from '../dados/pelada.js'
import { irPara } from '../util/rotas.js'

export default function Inicial() {
  const [minhas, definirMinhas] = useState([])
  const [endereco, definirEndereco] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all(
      peladasDoCelular().map(async (id) => ({ id, dados: await lerDoc(`peladas/${id}`).catch(() => null) })),
    ).then((lista) => ativo && definirMinhas(lista))
    return () => {
      ativo = false
    }
  }, [])

  function abrirPorEndereco(evento) {
    evento.preventDefault()
    const id = apelidoDoEndereco(endereco)
    if (id) irPara(`/p/${id}/entrar`)
  }

  return (
    <div className="app">
      <Cabecalho titulo="Peladas" linha="Lista, times, gols e pagamento" />
      <div className="conteudo">
        <AvisoModoTeste />

        {minhas.length > 0 && (
          <>
            <h2 className="titulo-secao">Minhas peladas</h2>
            <ul className="lista">
              {minhas.map(({ id, dados }) => (
                <li key={id}>
                  <button type="button" className="lista__item" onClick={() => irPara(`/p/${id}`)}>
                    <span className="lista__textos">
                      <span className="lista__nome">{dados?.nome || id}</span>
                      <span className="lista__detalhe">
                        {dados ? `${dados.local} · ${dados.cobranca === 'mensal' ? 'mensalidade' : 'rateio'}` : 'toque para abrir'}
                      </span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <form className="cartao" onSubmit={abrirPorEndereco}>
          <h2 className="titulo-secao">Entrar numa pelada</h2>
          <p className="ajuda">
            A diretoria manda o link da pelada no grupo. Se você tiver só o nome do endereço, digite aqui.
          </p>
          <div className="campo">
            <label htmlFor="endereco">Endereço da pelada</label>
            <input
              id="endereco"
              value={endereco}
              onChange={(evento) => definirEndereco(evento.target.value)}
              placeholder="pelada-da-madrugada"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="botao botao--principal" disabled={!endereco.trim()}>
            Continuar
          </button>
        </form>

        <button type="button" className="botao botao--contorno" onClick={() => irPara('/nova')}>
          Criar uma pelada
        </button>
      </div>
    </div>
  )
}
