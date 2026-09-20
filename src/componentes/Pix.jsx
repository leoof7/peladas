import { useState } from 'react'

// Mostra a chave Pix de quem recebe, com botão de copiar. Sem QR Code:
// a pelada combinou que é a chave mesmo, copiada e colada no banco.
export default function Pix({ recebedor, titulo = 'Quem recebe', valor }) {
  const [copiado, definirCopiado] = useState(false)

  if (!recebedor?.chave) {
    return <p className="ajuda">A diretoria ainda não cadastrou a chave Pix em Configurações.</p>
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(recebedor.chave)
      definirCopiado(true)
      setTimeout(() => definirCopiado(false), 2000)
    } catch {
      definirCopiado(false)
    }
  }

  return (
    <div className="cartao" style={{ background: 'var(--chao)', border: 0, padding: 12, gap: 8 }}>
      <span className="lista__detalhe">
        {titulo}
        {valor ? ` · ${valor}` : ''}
      </span>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{recebedor.nome}</span>
      <span style={{ fontSize: 12, color: 'var(--suave)' }}>{recebedor.tipoChave || 'Chave Pix'}</span>
      <span style={{ fontSize: 17, fontWeight: 700, wordBreak: 'break-all' }}>{recebedor.chave}</span>
      <button type="button" className="botao botao--contorno" onClick={copiar}>
        {copiado ? 'Chave copiada' : 'Copiar chave Pix'}
      </button>
    </div>
  )
}
