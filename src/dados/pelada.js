// Regras de criação e de entrada numa pelada.
import { agora, gravar, gravarLote, lerDoc, modoTeste, novoId } from './api.js'
import { resumoDoPin } from '../util/pin.js'

export const TIPOS = {
  'campo-mensal': {
    nome: 'Campo · mensalidade',
    resumo: 'Mensalidade fixa por mês e R$ 2 de quem perde ou empata. Um jogo por domingo.',
    local: 'Campo',
    cobranca: 'mensal',
    padroes: {
      mensalidade: 60,
      valorDerrota: 2,
      jogamPorDia: 22,
      naLinhaPorTime: 10,
      uniformes: [
        { nome: 'Azul', cor: '#1F4F8F' },
        { nome: 'Branco', cor: '#FFFFFF' },
      ],
    },
  },
  'quadra-rateio': {
    nome: 'Quadra · rateio',
    resumo: 'Sem mensalidade. O aluguel da quadra é dividido por quem jogou.',
    local: 'Quadra',
    cobranca: 'rateio',
    padroes: {
      valorAluguel: 0,
      limiteVagas: 20,
      naLinhaPorTime: 5,
      uniformes: [],
    },
  },
}

const LETRAS_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function gerarCodigo(tamanho = 6) {
  const sorteio = crypto.getRandomValues(new Uint8Array(tamanho))
  return Array.from(sorteio, (numero) => LETRAS_CODIGO[numero % LETRAS_CODIGO.length]).join('')
}

export function apelidoDoEndereco(nome) {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return limpo.slice(0, 28) || 'pelada'
}

export async function criarPelada({ nome, tipo, usuario, nomeDeQuemCriou, pin }) {
  const modelo = TIPOS[tipo]
  if (!modelo) throw new Error('Tipo de pelada desconhecido.')

  let peladaId = apelidoDoEndereco(nome)
  if (await lerDoc(`peladas/${peladaId}`)) peladaId = `${peladaId}-${gerarCodigo(4).toLowerCase()}`

  const codigos = { participante: gerarCodigo(), diretoria: gerarCodigo() }
  const jogadorId = novoId()
  const resumo = await resumoDoPin(peladaId, jogadorId, pin)
  const criadoEm = agora()

  await gravarLote([
    {
      caminho: `peladas/${peladaId}`,
      dados: {
        nome,
        tipo,
        local: modelo.local,
        cobranca: modelo.cobranca,
        foto: '',
        donoUsuario: usuario,
        criadoEm,
        config: modelo.padroes,
      },
      mesclar: false,
    },
    { caminho: `peladas/${peladaId}/privado/codigos`, dados: { ...codigos, criadoEm }, mesclar: false },
    {
      caminho: `peladas/${peladaId}/jogadores/${jogadorId}`,
      dados: {
        nome: nomeDeQuemCriou,
        apelido: '',
        posicao: 'meio',
        tipoJogador: 'fixo',
        isento: false,
        ativo: true,
        criadoEm,
      },
      mesclar: false,
    },
    {
      caminho: `peladas/${peladaId}/pins/${jogadorId}`,
      dados: { resumo, codigo: codigos.diretoria, criadoEm },
      mesclar: false,
    },
    {
      caminho: `peladas/${peladaId}/membros/${usuario}`,
      dados: { papel: 'diretoria', jogadorId, codigo: codigos.diretoria, resumoDoPin: resumo, criadoEm },
      mesclar: false,
    },
  ])

  guardarPeladaDoCelular(peladaId)
  return { peladaId, codigos, jogadorId }
}

// Entrada de um jogador: confere o código da pelada e o PIN.
// Na nuvem quem confere são as regras de segurança do Firebase — o resumo do
// PIN e os códigos nunca são lidos pelo celular. No modo de teste a conferência
// é feita aqui mesmo, porque não existe servidor.
export async function entrarNaPelada({ peladaId, codigo, jogadorId, pin, usuario }) {
  const resumo = await resumoDoPin(peladaId, jogadorId, pin)
  const codigoLimpo = codigo.trim().toUpperCase()

  if (modoTeste) {
    const codigos = await lerDoc(`peladas/${peladaId}/privado/codigos`)
    if (!codigos) throw new Error('Pelada não encontrada.')
    if (codigoLimpo !== codigos.participante && codigoLimpo !== codigos.diretoria) {
      throw new Error('Código da pelada errado.')
    }
    const pinGuardado = await lerDoc(`peladas/${peladaId}/pins/${jogadorId}`)
    if (pinGuardado && pinGuardado.resumo !== resumo) throw new Error('PIN errado.')
  }

  // Primeiro acesso do jogador: cria o PIN. Se já existir, a gravação é
  // recusada e seguimos em frente com o PIN que ele já tinha.
  try {
    await gravar(
      `peladas/${peladaId}/pins/${jogadorId}`,
      { resumo, codigo: codigoLimpo, criadoEm: agora() },
      { mesclar: false },
    )
  } catch {
    // Já existe PIN pra esse jogador: a conferência acontece na gravação abaixo.
  }

  // Na nuvem o celular não sabe qual código foi digitado, o de jogador ou o da
  // diretoria. Tentamos entrar como diretoria; se as regras recusarem, entramos
  // como participante. No modo de teste já sabemos o papel.
  const tentativas = modoTeste ? [await papelNoModoTeste(peladaId, codigoLimpo)] : ['diretoria', 'participante']

  for (const papel of tentativas) {
    try {
      await gravar(
        `peladas/${peladaId}/membros/${usuario}`,
        { papel, jogadorId, codigo: codigoLimpo, resumoDoPin: resumo, criadoEm: agora() },
        { mesclar: false },
      )
      guardarPeladaDoCelular(peladaId)
      return { papel, jogadorId }
    } catch {
      // Tenta o próximo papel.
    }
  }

  throw new Error('Código da pelada ou PIN errado.')
}

async function papelNoModoTeste(peladaId, codigo) {
  const codigos = await lerDoc(`peladas/${peladaId}/privado/codigos`)
  return codigo === codigos.diretoria ? 'diretoria' : 'participante'
}

const CHAVE_MINHAS = 'peladas:minhas'

export function peladasDoCelular() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_MINHAS) || '[]')
  } catch {
    return []
  }
}

export function guardarPeladaDoCelular(peladaId) {
  const lista = peladasDoCelular()
  if (!lista.includes(peladaId)) {
    try {
      localStorage.setItem(CHAVE_MINHAS, JSON.stringify([...lista, peladaId]))
    } catch {
      // Sem armazenamento: a pessoa digita o código de novo na próxima vez.
    }
  }
}

export function esquecerPeladaDoCelular(peladaId) {
  try {
    localStorage.setItem(CHAVE_MINHAS, JSON.stringify(peladasDoCelular().filter((id) => id !== peladaId)))
  } catch {
    // Sem armazenamento: nada a fazer.
  }
}
