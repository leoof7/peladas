# ADR 0001 — Site estático no GitHub Pages com banco no Firebase

Data: 17/09/2026
Situação: aceita

## Contexto

O app precisa ser aberto no celular por duas peladas (umas 50 pessoas no total),
sem custo mensal, com o dado compartilhado entre todo mundo. O Leandro não é
programador e não quer manter servidor.

## Decisão

- **Site estático publicado no GitHub Pages.** Sem servidor pra cuidar e sem
  custo. A publicação é automática a cada envio pro ramo `main`.
- **Firebase (Firestore) como banco de dados**, com login anônimo. O Supabase do
  Leandro já está no limite do plano, então ficou o Firebase.
- **A segurança mora nas regras do Firestore** (`firestore.rules`), não no
  aplicativo. Como o site é público e o código fica visível, qualquer regra
  escrita só na tela seria contornável.
- **Acesso por código da pelada + nome + PIN de 4 números.** Sem cadastro de
  e-mail e senha, que dá trabalho e o pessoal esquece. O PIN é guardado como
  resumo (SHA-256) e conferido dentro das regras do Firestore, que conseguem ler
  um documento que o celular não consegue.
- **Dois papéis:** diretoria (edita tudo) e participante (consulta, copia a chave
  Pix e lança os próprios gols pra diretoria aprovar).
- **Modo de teste sem nuvem.** Quando não existe configuração do Firebase, o app
  guarda tudo no próprio navegador. Isso permitiu testar as telas antes do
  Firebase existir e continua servindo pra experimentar sem sujar os dados.

## Consequências

- O custo fica em zero enquanto couber no plano grátis do Firebase. Esse plano
  pausa o projeto depois de 7 dias sem uso; com pelada toda semana, tende a não
  acontecer.
- O repositório precisa ser público, porque o GitHub Pages grátis não publica
  repositório privado. Nenhuma chave fica no código, e os dados ficam protegidos
  pelas regras do Firestore.
- A lista de nomes dos jogadores é legível por quem tiver o endereço da pelada:
  é assim que a pessoa se encontra na tela de entrar. Dinheiro, presença e
  estatística só depois de entrar.
- Um PIN de 4 números é fraco contra quem tentar adivinhar em massa. Pra isso,
  a pessoa precisaria também do código da pelada. Se virar problema, dá pra
  trocar o código ou aumentar o PIN.
