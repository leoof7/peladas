// O PIN nunca é guardado como número. Guardamos só este resumo, que não dá
// pra desfazer. Quem esquecer o PIN, a diretoria zera e a pessoa cria outro.
export async function resumoDoPin(peladaId, jogadorId, pin) {
  const texto = `${peladaId}:${jogadorId}:${pin}`
  const bytes = new TextEncoder().encode(texto)
  const resumo = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(resumo), (numero) => numero.toString(16).padStart(2, '0')).join('')
}

export function pinValido(pin) {
  return /^\d{4}$/.test(pin)
}
