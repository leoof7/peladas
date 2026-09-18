export default function Cabecalho({ titulo, linha, aoVoltar, selo }) {
  return (
    <header className="cabecalho">
      {aoVoltar && (
        <button type="button" className="cabecalho__voltar" onClick={aoVoltar} aria-label="Voltar">
          ‹
        </button>
      )}
      <div className="cabecalho__textos">
        <h1 className="cabecalho__titulo">{titulo}</h1>
        {linha && <span className="cabecalho__linha">{linha}</span>}
      </div>
      {selo && <span className="selo selo--claro">{selo}</span>}
    </header>
  )
}
