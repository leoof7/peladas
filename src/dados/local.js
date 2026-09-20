// Modo de teste: guarda tudo no próprio navegador, sem nuvem.
// Serve pra experimentar o app antes do Firebase estar pronto.
// Aqui não existe segurança de verdade: quem abre o celular vê o que está salvo.
const CHAVE_DADOS = 'peladas:dados'
const CHAVE_USUARIO = 'peladas:usuario'

const ouvintes = new Set()
let dados = ler()

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DADOS) || '{}')
  } catch {
    return {}
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados))
  } catch {
    // Navegador anônimo ou armazenamento bloqueado: segue só na memória.
  }
  for (const avisar of ouvintes) avisar()
}

function ultimoPedaco(caminho) {
  return caminho.split('/').pop()
}

function ehFilhoDireto(caminho, colecao) {
  return caminho.startsWith(`${colecao}/`) && !caminho.slice(colecao.length + 1).includes('/')
}

export const temConfiguracao = false

export async function entrar() {
  let usuario = null
  try {
    usuario = localStorage.getItem(CHAVE_USUARIO)
  } catch {
    // Sem armazenamento: cria um identificador novo logo abaixo.
  }
  if (!usuario) {
    usuario = novoId()
    try {
      localStorage.setItem(CHAVE_USUARIO, usuario)
    } catch {
      // Sem armazenamento: o identificador vale só enquanto a página estiver aberta.
    }
  }
  return usuario
}

export function assinarDoc(caminho, aoMudar) {
  const avisar = () => aoMudar(dados[caminho] ? { id: ultimoPedaco(caminho), ...dados[caminho] } : null)
  avisar()
  ouvintes.add(avisar)
  return () => ouvintes.delete(avisar)
}

export function assinarColecao(caminho, aoMudar) {
  const avisar = () =>
    aoMudar(
      Object.entries(dados)
        .filter(([chave]) => ehFilhoDireto(chave, caminho))
        .map(([chave, valor]) => ({ id: ultimoPedaco(chave), ...valor })),
    )
  avisar()
  ouvintes.add(avisar)
  return () => ouvintes.delete(avisar)
}

export async function lerDoc(caminho) {
  return dados[caminho] ? { id: ultimoPedaco(caminho), ...dados[caminho] } : null
}

// Mescla igual ao Firebase: mapa dentro de mapa se junta chave por chave,
// lista é trocada inteira.
function mesclarFundo(atual, novo) {
  const resultado = { ...(atual || {}) }
  for (const [chave, valor] of Object.entries(novo || {})) {
    const ehMapa = valor && typeof valor === 'object' && !Array.isArray(valor)
    const tinhaMapa = resultado[chave] && typeof resultado[chave] === 'object' && !Array.isArray(resultado[chave])
    resultado[chave] = ehMapa && tinhaMapa ? mesclarFundo(resultado[chave], valor) : valor
  }
  return resultado
}

export async function gravar(caminho, novosDados, { mesclar = true } = {}) {
  dados[caminho] = mesclar ? mesclarFundo(dados[caminho], novosDados) : { ...novosDados }
  salvar()
}

export async function gravarLote(itens) {
  for (const { caminho, dados: novosDados, mesclar = true } of itens) {
    dados[caminho] = mesclar ? mesclarFundo(dados[caminho], novosDados) : { ...novosDados }
  }
  salvar()
}

export async function apagar(caminho) {
  delete dados[caminho]
  salvar()
}

export function novoId() {
  const letras = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const sorteio = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(sorteio, (numero) => letras[numero % letras.length]).join('')
}
