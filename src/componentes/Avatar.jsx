export function iniciais(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

// Bolinha do jogador: a foto, se tiver; senão, as iniciais do nome.
export default function Avatar({ nome, foto, tamanho = 'normal' }) {
  return (
    <span className={`avatar avatar--${tamanho}`} aria-hidden="true">
      {foto ? <img src={foto} alt="" /> : iniciais(nome)}
    </span>
  )
}
