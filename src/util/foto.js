// Foto de celular tem muito mais tamanho do que uma bolinha de 60 pixels
// precisa. Antes de guardar, corta no quadrado do meio e encolhe — senão cada
// jogador fica pesando megabytes no banco.
const LADO = 240
const QUALIDADE = 0.72

async function carregarImagem(arquivo) {
  // O caminho moderno já devolve a foto em pé, mesmo quando o celular gravou
  // deitada. Se o navegador não tiver, cai no jeito antigo.
  if (window.createImageBitmap) {
    try {
      return await window.createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    } catch {
      // segue pro jeito antigo
    }
  }
  const endereco = URL.createObjectURL(arquivo)
  try {
    return await new Promise((resolver, recusar) => {
      const imagem = new Image()
      imagem.onload = () => resolver(imagem)
      imagem.onerror = () => recusar(new Error('Esse arquivo não parece uma foto.'))
      imagem.src = endereco
    })
  } finally {
    URL.revokeObjectURL(endereco)
  }
}

export async function encolherFoto(arquivo) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) {
    throw new Error('Escolha uma foto.')
  }
  const imagem = await carregarImagem(arquivo)
  const largura = imagem.width
  const altura = imagem.height
  const menorLado = Math.min(largura, altura)
  const tela = document.createElement('canvas')
  tela.width = LADO
  tela.height = LADO
  const pincel = tela.getContext('2d')
  pincel.drawImage(
    imagem,
    (largura - menorLado) / 2,
    (altura - menorLado) / 2,
    menorLado,
    menorLado,
    0,
    0,
    LADO,
    LADO,
  )
  imagem.close?.()
  return tela.toDataURL('image/jpeg', QUALIDADE)
}
