// Navegação simples pelo endereço da página (o que vem depois do #).
// Assim o app funciona no GitHub Pages sem servidor nenhum.
import { useEffect, useState } from 'react'

function lerRota() {
  const bruto = window.location.hash.replace(/^#/, '')
  return bruto.split('/').filter(Boolean).map(decodeURIComponent)
}

export function useRota() {
  const [rota, definirRota] = useState(lerRota)

  useEffect(() => {
    const aoMudar = () => definirRota(lerRota())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  return rota
}

export function irPara(caminho) {
  window.location.hash = caminho
}

export function voltar() {
  window.history.back()
}
