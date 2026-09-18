// Conversa com o Firebase (banco de dados na nuvem).
// Só é usado quando o arquivo .env tem os dados de conexão preenchidos.
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

const configuracao = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const temConfiguracao = Boolean(configuracao.apiKey && configuracao.projectId)

let banco = null
let autenticacao = null

if (temConfiguracao) {
  const app = initializeApp(configuracao)
  // O cache guardado no celular faz o app abrir e funcionar mesmo sem sinal.
  banco = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  autenticacao = getAuth(app)
}

function comIdentificador(instantaneo) {
  return { id: instantaneo.id, ...instantaneo.data() }
}

export async function entrar() {
  const credencial = await signInAnonymously(autenticacao)
  return credencial.user.uid
}

export function assinarDoc(caminho, aoMudar, aoFalhar) {
  return onSnapshot(
    doc(banco, caminho),
    (instantaneo) => aoMudar(instantaneo.exists() ? comIdentificador(instantaneo) : null),
    (erro) => aoFalhar?.(erro),
  )
}

export function assinarColecao(caminho, aoMudar, aoFalhar) {
  return onSnapshot(
    collection(banco, caminho),
    (instantaneo) => aoMudar(instantaneo.docs.map(comIdentificador)),
    (erro) => aoFalhar?.(erro),
  )
}

export async function lerDoc(caminho) {
  const instantaneo = await getDoc(doc(banco, caminho))
  return instantaneo.exists() ? comIdentificador(instantaneo) : null
}

export async function gravar(caminho, dados, { mesclar = true } = {}) {
  await setDoc(doc(banco, caminho), dados, { merge: mesclar })
}

export async function gravarLote(itens) {
  const lote = writeBatch(banco)
  for (const { caminho, dados, mesclar = true } of itens) {
    lote.set(doc(banco, caminho), dados, { merge: mesclar })
  }
  await lote.commit()
}

export async function apagar(caminho) {
  await deleteDoc(doc(banco, caminho))
}

export function novoId() {
  return doc(collection(banco, 'ids')).id
}
