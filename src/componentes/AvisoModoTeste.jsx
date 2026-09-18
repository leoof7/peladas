import { modoTeste } from '../dados/api.js'

export default function AvisoModoTeste() {
  if (!modoTeste) return null
  return (
    <div className="cartao cartao--aviso">
      <strong>Modo de teste.</strong> O Firebase ainda não está ligado, então tudo que você fizer aqui fica
      guardado só neste aparelho e ninguém mais vê. Serve pra experimentar as telas.
    </div>
  )
}
