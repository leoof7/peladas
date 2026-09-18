import { useState } from 'react'
import AvisoModoTeste from '../componentes/AvisoModoTeste.jsx'
import Cabecalho from '../componentes/Cabecalho.jsx'
import { TIPOS, criarPelada } from '../dados/pelada.js'
import { pinValido } from '../util/pin.js'
import { irPara } from '../util/rotas.js'

export default function Criar({ usuario }) {
  const [nome, definirNome] = useState('')
  const [tipo, definirTipo] = useState('campo-mensal')
  const [meuNome, definirMeuNome] = useState('')
  const [pin, definirPin] = useState('')
  const [erro, definirErro] = useState('')
  const [salvando, definirSalvando] = useState(false)

  function oQueFalta() {
    if (nome.trim().length < 3) return 'Escreva o nome da pelada.'
    if (meuNome.trim().length < 2) return 'Escreva o seu nome.'
    if (!pinValido(pin)) return 'O PIN é de 4 números.'
    return ''
  }

  async function salvar(evento) {
    evento.preventDefault()
    if (salvando) return
    const falta = oQueFalta()
    if (falta) {
      definirErro(falta)
      return
    }
    definirSalvando(true)
    definirErro('')
    try {
      const { peladaId } = await criarPelada({
        nome: nome.trim(),
        tipo,
        usuario,
        nomeDeQuemCriou: meuNome.trim(),
        pin,
      })
      irPara(`/p/${peladaId}/config`)
    } catch {
      definirErro('Não consegui criar a pelada. Tente de novo.')
      definirSalvando(false)
    }
  }

  return (
    <div className="app">
      <Cabecalho titulo="Criar pelada" linha="Você fica como diretoria" aoVoltar={() => irPara('/')} />
      <form className="conteudo" onSubmit={salvar}>
        <AvisoModoTeste />
        {erro && <p className="erro">{erro}</p>}

        <div className="campo">
          <label htmlFor="nome">Nome da pelada</label>
          <input
            id="nome"
            value={nome}
            onChange={(evento) => definirNome(evento.target.value)}
            placeholder="Pelada da Madrugada"
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <span className="titulo-secao">Como funciona a cobrança</span>
          <div className="opcoes" role="radiogroup" aria-label="Tipo da pelada">
            {Object.entries(TIPOS).map(([chave, modelo]) => (
              <button
                key={chave}
                type="button"
                role="radio"
                aria-checked={tipo === chave}
                aria-pressed={tipo === chave}
                className="opcao"
                onClick={() => definirTipo(chave)}
              >
                <span className="opcao__nome">{modelo.nome}</span>
                <span className="opcao__resumo">{modelo.resumo}</span>
              </button>
            ))}
          </div>
          <p className="ajuda">Isso não muda depois. Cada pelada tem o seu jeito.</p>
        </div>

        <div className="campo">
          <label htmlFor="meu-nome">Seu nome</label>
          <input
            id="meu-nome"
            value={meuNome}
            onChange={(evento) => definirMeuNome(evento.target.value)}
            placeholder="Como o pessoal te chama"
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label htmlFor="pin">Seu PIN de 4 números</label>
          <input
            id="pin"
            value={pin}
            onChange={(evento) => definirPin(evento.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            className="codigo"
          />
          <p className="ajuda">É com ele que você entra no app daqui pra frente.</p>
        </div>

        <button type="submit" className="botao botao--principal" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar pelada'}
        </button>
      </form>
    </div>
  )
}
