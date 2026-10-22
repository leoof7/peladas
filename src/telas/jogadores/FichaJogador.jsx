import { useRef, useState } from 'react'
import Avatar from '../../componentes/Avatar.jsx'
import { POSICOES } from '../../dados/estrelas.js'
import { encolherFoto } from '../../util/foto.js'

const VAZIO = {
  nome: '',
  apelido: '',
  posicao: 'meio',
  tipoJogador: 'fixo',
  isento: false,
  ativo: true,
  foto: '',
}

// Ficha completa do jogador. O nome dá pra mudar direto na lista; aqui ficam o
// resto das coisas: apelido, posição, foto, quem saiu e o PIN.
export default function FichaJogador({ jogador, aoSalvar, aoZerarPin, aoFechar, erro }) {
  const [dados, definirDados] = useState({ ...VAZIO, ...(jogador || {}) })
  const [avisoDaFoto, definirAvisoDaFoto] = useState('')
  const [lendoFoto, definirLendoFoto] = useState(false)
  const [pinZerado, definirPinZerado] = useState(false)
  const escolhedor = useRef(null)
  const ehNovo = !jogador?.id

  function mudar(campos) {
    definirDados((atual) => ({ ...atual, ...campos }))
  }

  async function pegarFoto(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    definirLendoFoto(true)
    definirAvisoDaFoto('')
    try {
      mudar({ foto: await encolherFoto(arquivo) })
    } catch (falha) {
      definirAvisoDaFoto(falha.message || 'Não consegui usar essa foto.')
    }
    definirLendoFoto(false)
  }

  return (
    <form
      className="cartao"
      onSubmit={(evento) => {
        evento.preventDefault()
        aoSalvar(dados)
      }}
    >
      <h2 className="titulo-secao">{ehNovo ? 'Novo jogador' : 'Ficha do jogador'}</h2>
      {erro && <p className="erro">{erro}</p>}

      <div className="ficha-foto">
        <Avatar nome={dados.nome} foto={dados.foto} tamanho="gigante" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="botao botao--pequeno"
            onClick={() => escolhedor.current?.click()}
            disabled={lendoFoto}
          >
            {lendoFoto ? 'Carregando…' : dados.foto ? 'Trocar foto' : 'Pôr foto'}
          </button>
          {dados.foto && (
            <button type="button" className="botao botao--pequeno" onClick={() => mudar({ foto: '' })}>
              Tirar foto
            </button>
          )}
        </div>
        <input
          ref={escolhedor}
          type="file"
          accept="image/*"
          className="escondido"
          onChange={pegarFoto}
        />
        {avisoDaFoto && <p className="erro">{avisoDaFoto}</p>}
      </div>

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          value={dados.nome}
          onChange={(evento) => mudar({ nome: evento.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="campo">
        <label htmlFor="apelido">Apelido (opcional)</label>
        <input
          id="apelido"
          value={dados.apelido}
          onChange={(evento) => mudar({ apelido: evento.target.value })}
          autoComplete="off"
        />
        <p className="ajuda">O apelido também conta quando a lista do grupo é colada.</p>
      </div>

      <div className="campo">
        <span className="titulo-secao">Posição</span>
        <div className="opcoes opcoes--quatro" role="radiogroup" aria-label="Posição do jogador">
          {POSICOES.map((posicao) => (
            <button
              key={posicao.chave}
              type="button"
              role="radio"
              aria-checked={dados.posicao === posicao.chave}
              className={`opcao${dados.posicao === posicao.chave ? ' opcao--marcada' : ''}`}
              onClick={() =>
                mudar({
                  posicao: posicao.chave,
                  // "Não paga" é coisa de goleiro fixo: sai de cena com a posição.
                  isento: posicao.chave === 'goleiro' ? dados.isento : false,
                })
              }
            >
              {posicao.uma}
            </button>
          ))}
        </div>
        <p className="ajuda">Lateral e volante contam como defesa.</p>
      </div>

      {dados.posicao === 'goleiro' && (
        <label className="lista__item lista__item--fixo" style={{ padding: 0 }}>
          <input
            type="checkbox"
            checked={dados.isento}
            onChange={(evento) => mudar({ isento: evento.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span className="lista__textos">
            <span className="lista__nome">Goleiro fixo, não paga</span>
            <span className="lista__detalhe">
              Não paga mensalidade nem os R$ 2. Gols e presença contam igual.
            </span>
          </span>
        </label>
      )}

      {!ehNovo && (
        <label className="lista__item lista__item--fixo" style={{ padding: 0 }}>
          <input
            type="checkbox"
            checked={dados.ativo !== false}
            onChange={(evento) => mudar({ ativo: evento.target.checked })}
            style={{ width: 22, height: 22 }}
          />
          <span className="lista__textos">
            <span className="lista__nome">Continua na pelada</span>
            <span className="lista__detalhe">Desmarque quem saiu. O histórico dele fica guardado.</span>
          </span>
        </label>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="botao" style={{ flex: 1 }} onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" style={{ flex: 1 }}>
          Salvar
        </button>
      </div>

      {!ehNovo && (
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={async () => {
            await aoZerarPin()
            definirPinZerado(true)
          }}
        >
          {pinZerado ? 'PIN zerado ✓' : 'Zerar PIN'}
        </button>
      )}
    </form>
  )
}
