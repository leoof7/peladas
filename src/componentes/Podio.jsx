import Avatar from './Avatar.jsx'

// Os três primeiros, do jeito que pódio é: o segundo à esquerda, o primeiro no
// meio e mais alto, o terceiro à direita. Os degraus sobem quando a tela abre.
const LUGARES = [1, 0, 2]

function numeroDaColuna(linha, coluna) {
  const valor = linha[coluna] || 0
  return coluna === 'aproveitamento' ? `${valor}%` : valor
}

export default function Podio({ tres, coluna, jogadores, meuId }) {
  if (tres.length === 0) return null
  const fotoDe = (jogadorId) => jogadores.find((jogador) => jogador.id === jogadorId)?.foto

  return (
    <section className="podio" aria-label="Os três primeiros">
      <div className="podio__degraus">
        {LUGARES.filter((posicao) => tres[posicao]).map((posicao) => {
          const linha = tres[posicao]
          return (
            <div key={linha.jogadorId} className={`podio__lugar podio__lugar--${posicao + 1}`}>
              <div className="podio__foto">
                <Avatar
                  nome={linha.nome}
                  foto={fotoDe(linha.jogadorId)}
                  tamanho={posicao === 0 ? 'grande' : 'normal'}
                />
              </div>
              <p className="podio__nome">
                {linha.nome}
                {meuId === linha.jogadorId && <span className="podio__voce"> · você</span>}
              </p>
              <p className="podio__numeros">
                {linha.gols}G · {linha.assistencias}A
              </p>
              <div className="podio__bloco">
                <span className="podio__posicao">{posicao + 1}</span>
                <span className="podio__destaque">{numeroDaColuna(linha, coluna)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
