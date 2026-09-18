// Porta de entrada dos dados. Se o Firebase estiver configurado, usa a nuvem.
// Se não estiver, o app roda em modo de teste, guardando tudo no próprio celular.
import * as nuvem from './firebase.js'
import * as teste from './local.js'

const motor = nuvem.temConfiguracao ? nuvem : teste

export const modoTeste = !nuvem.temConfiguracao
export const entrar = motor.entrar
export const assinarDoc = motor.assinarDoc
export const assinarColecao = motor.assinarColecao
export const lerDoc = motor.lerDoc
export const gravar = motor.gravar
export const gravarLote = motor.gravarLote
export const apagar = motor.apagar
export const novoId = motor.novoId

export function agora() {
  return new Date().toISOString()
}
