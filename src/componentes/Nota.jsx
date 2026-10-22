import { useRef, useState } from 'react'
import { NOTA_MAXIMA, PASSO, arredondar, notaEmNumero } from '../dados/estrelas.js'

const CAMINHO = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
const ESTRELAS = [1, 2, 3, 4, 5]

function Estrela({ cheia }) {
  return (
    <span className="estrela" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="estrela__fundo">
        <path d={CAMINHO} />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="estrela__ouro"
        style={{ clipPath: `inset(0 ${100 - cheia * 100}% 0 0)` }}
      >
        <path d={CAMINHO} />
      </svg>
    </span>
  )
}

// As cinco estrelas. Dá pra tocar numa delas ou ir arrastando o dedo por cima;
// nos dois casos a nota anda de meia em meia. Quem não é da diretoria só vê.
export default function Nota({ valor, aoMudar, rotulo, tamanho = 'normal', somenteLeitura = false }) {
  const nota = arredondar(valor)
  const trilha = useRef(null)
  // A medida da barra é tirada uma vez, quando o dedo encosta, e vale até ele
  // sair. Se fosse medida a cada movimento, a barra andaria debaixo do dedo.
  const areaDoArrasto = useRef(null)
  const [arrastando, definirArrastando] = useState(false)

  // Onde o dedo está na barra vira nota: o comecinho da primeira estrela já
  // vale meia, e o fim da última vale 5.
  function notaOndeEstaODedo(x) {
    const area = areaDoArrasto.current || trilha.current?.getBoundingClientRect()
    if (!area || area.width === 0) return nota
    const parte = (x - area.left) / area.width
    if (parte <= 0) return 0
    return arredondar(Math.ceil(parte * NOTA_MAXIMA * 2) / 2)
  }

  function mudar(novaNota) {
    if (novaNota !== nota) aoMudar(novaNota)
  }

  function aoEncostar(evento) {
    if (evento.button !== undefined && evento.button !== 0) return
    // Sem isto, arrastar o dedo sai selecionando o texto em volta.
    evento.preventDefault()
    areaDoArrasto.current = evento.currentTarget.getBoundingClientRect()
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId)
    } catch {
      // Navegador que não deixa capturar: o arrasto segue mesmo assim.
    }
    definirArrastando(true)
    const escolhida = notaOndeEstaODedo(evento.clientX)
    // Tocar de novo na meia estrela que já está marcada zera a nota.
    mudar(escolhida === PASSO && nota === PASSO ? 0 : escolhida)
  }

  function aoArrastar(evento) {
    if (!arrastando) return
    mudar(notaOndeEstaODedo(evento.clientX))
  }

  function aoSoltar(evento) {
    if (!arrastando) return
    definirArrastando(false)
    areaDoArrasto.current = null
    try {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    } catch {
      // já tinha soltado
    }
  }

  function aoTeclar(evento) {
    const passos = { ArrowRight: PASSO, ArrowUp: PASSO, ArrowLeft: -PASSO, ArrowDown: -PASSO }
    if (evento.key in passos) {
      evento.preventDefault()
      mudar(arredondar(nota + passos[evento.key]))
    } else if (evento.key === 'Home') {
      evento.preventDefault()
      mudar(0)
    } else if (evento.key === 'End') {
      evento.preventDefault()
      mudar(NOTA_MAXIMA)
    }
  }

  const texto = nota === 0 ? 'sem nota' : `${notaEmNumero(nota)} de 5`

  return (
    <span className={`nota nota--${tamanho}${arrastando ? ' nota--arrastando' : ''}`}>
      <span
        ref={trilha}
        className="nota__trilha"
        role={somenteLeitura ? 'img' : 'slider'}
        aria-label={`${rotulo}: ${texto}`}
        tabIndex={somenteLeitura ? undefined : 0}
        aria-valuemin={somenteLeitura ? undefined : 0}
        aria-valuemax={somenteLeitura ? undefined : NOTA_MAXIMA}
        aria-valuenow={somenteLeitura ? undefined : nota}
        aria-valuetext={somenteLeitura ? undefined : texto}
        onPointerDown={somenteLeitura ? undefined : aoEncostar}
        onPointerMove={somenteLeitura ? undefined : aoArrastar}
        onPointerUp={somenteLeitura ? undefined : aoSoltar}
        onPointerCancel={somenteLeitura ? undefined : aoSoltar}
        onKeyDown={somenteLeitura ? undefined : aoTeclar}
      >
        {ESTRELAS.map((posicao) => (
          <Estrela key={posicao} cheia={Math.min(1, Math.max(0, nota - posicao + 1))} />
        ))}
      </span>
      <span className={`nota__valor${nota === 0 ? ' nota__valor--vazio' : ''}`}>
        {nota === 0 ? '—' : notaEmNumero(nota)}
      </span>
    </span>
  )
}
