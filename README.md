# Peladas

App das peladas do Leandro: **Pelada da Madrugada** (campo, mensalidade) e **Pelada Shekinah** (quadra, rateio).
Lista de quem vai, times, gols, assistências e quem já pagou.

Site: GitHub Pages. Banco de dados: Firebase (Firestore).

## Documentos

- [Regras do negócio](docs/regras-do-negocio.md) — como cada pelada funciona e o que foi combinado.
- [Decisões de arquitetura](docs/adr) — por que o app foi montado assim.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem o arquivo `.env`, o app abre em **modo de teste**: tudo fica guardado só no
navegador daquele aparelho. Serve pra experimentar as telas sem nuvem nenhuma.

Para ligar o Firebase, copie `.env.example` para `.env` e preencha com os dados
que aparecem em *Configurações do projeto > Seus aplicativos > Web*.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Abre o app no computador pra desenvolvimento |
| `npm run build` | Gera a versão que vai pro ar, na pasta `dist` |
| `npm run lint` | Confere o código |
| `npm run preview` | Abre a versão gerada, pra conferir antes de publicar |
| `npm run publicar` | Gera o site e publica no ar |

## Publicação

O site fica em **https://leoof7.github.io/peladas/**.

Para publicar uma versão nova:

```bash
npm run publicar
```

O comando gera a pasta `dist` e envia para o ramo `gh-pages`, que é o que o
GitHub Pages mostra. A configuração do Firebase entra na hora de gerar, a partir
do arquivo `.env` — por isso ele precisa estar preenchido na máquina que publica.

## Firebase

Projeto **FUTEBOIS** (`futebois`), plano grátis (Spark).

- Banco Firestore em **southamerica-east1 (São Paulo)**.
- Authentication com entrada **anônima** ligada — é só pra reconhecer o aparelho;
  quem identifica a pessoa é o código da pelada e o PIN.
- Para enviar as regras de segurança depois de alterá-las:

```bash
npx --yes firebase-tools deploy --only firestore:rules --project futebois
```

## Segurança

- As regras de quem pode ler e escrever ficam em `firestore.rules`, no servidor
  do Firebase. O aplicativo sozinho não consegue passar por cima delas.
- O PIN de cada jogador nunca é guardado como número, só como um resumo que não
  dá pra desfazer. Nem a diretoria lê esse resumo.
- Nenhuma chave fica dentro do código: tudo vem de variáveis de ambiente.
