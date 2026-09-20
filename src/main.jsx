import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './estilo.css'

// O app guarda uma cópia de si mesmo pra abrir sem sinal. Quando uma versão
// nova chega, esta linha recarrega a tela sozinha, uma vez só.
let jaRecarregou = false
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (jaRecarregou) return
  jaRecarregou = true
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
