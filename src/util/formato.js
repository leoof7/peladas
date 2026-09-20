const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function dinheiro(valor) {
  return MOEDA.format(Number(valor) || 0)
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Datas andam como texto "2026-09-20" pra não escorregar de fuso horário.
export function hoje() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

export function proximoDomingo(base = hoje()) {
  const data = deTexto(base)
  const faltam = (7 - data.getDay()) % 7
  data.setDate(data.getDate() + faltam)
  return paraTexto(data)
}

export function deTexto(texto) {
  const [ano, mes, dia] = String(texto || hoje()).split('-').map(Number)
  return new Date(ano, (mes || 1) - 1, dia || 1)
}

export function paraTexto(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

export function dataCurta(texto) {
  const data = deTexto(texto)
  return `${DIAS[data.getDay()]}, ${data.getDate()} ${MESES[data.getMonth()]}`
}

export function anoDe(texto) {
  return Number(String(texto || hoje()).slice(0, 4))
}

export function semAcento(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// "1 domingo" em vez de "1 domingos".
export function plural(quantidade, singular, muitos) {
  return `${quantidade} ${quantidade === 1 ? singular : muitos}`
}
