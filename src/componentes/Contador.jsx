// Botão de menos, número e botão de mais. Serve pra gol, assistência e placar.
export default function Contador({ valor, aoMudar, rotulo, tamanho = 'normal', desligado = false }) {
  const grande = tamanho === 'grande'
  const lado = grande ? 52 : 40

  return (
    <div className="contador">
      <button
        type="button"
        className="contador__botao"
        style={{ width: lado, height: lado }}
        aria-label={`Tirar ${rotulo}`}
        disabled={desligado || valor <= 0}
        onClick={() => aoMudar(Math.max(0, valor - 1))}
      >
        −
      </button>
      <span className={grande ? 'contador__valor contador__valor--grande' : 'contador__valor'}>{valor}</span>
      <button
        type="button"
        className="contador__botao contador__botao--mais"
        style={{ width: lado, height: lado }}
        aria-label={`Somar ${rotulo}`}
        disabled={desligado}
        onClick={() => aoMudar(valor + 1)}
      >
        +
      </button>
    </div>
  )
}
