# To Liso

Controle de gastos de cartão de crédito com divisão de despesas entre pessoas.

Este repositório é um **monorepo** com duas aplicações que consomem **a mesma base de dados (DynamoDB)** e compartilham as mesmas regras de negócio:

| Aplicação | Pasta | Stack |
| --- | --- | --- |
| Plataforma web | `apps/web` | Next.js 15 (App Router), React 19, Tailwind |
| Aplicativo Android | `apps/mobile` | Expo SDK 57, React Native 0.86, TypeScript |
| Regras compartilhadas | `packages/core` | TypeScript puro (sem build) |

```
toliso/
├── apps/
│   ├── web/            Plataforma web + API REST /api/v1 (consumida pelo app)
│   └── mobile/         Aplicativo React Native (Expo)
├── packages/
│   └── core/           Tipos, período de fatura, agregações, formatação
└── package.json        npm workspaces
```

## Como o código é compartilhado

O que antes vivia duplicado em cada tela agora tem uma única implementação:

- **`packages/core`** — modelos de dados, cálculo do período de fatura (ciclo do dia 16 ao 15), agrupamento de despesas parceladas/divididas, geração de faturas, formatação em pt-BR e o contrato da API. Web e mobile importam daqui, então os dois **sempre mostram os mesmos números**.
- **`apps/web/lib/operations/`** — regras de negócio (criar despesa parcelada, dividir entre usuários, registrar pagamento, CRUD de cartões e usuários). As Server Actions da web e as rotas REST do mobile chamam exatamente as mesmas funções.

## Pré-requisitos

- **Node.js 20 ou 22** (o Expo ainda não suporta o Node 25)
- npm 10+
- Para gerar o APK: conta [Expo](https://expo.dev) e a CLI do EAS (`npm i -g eas-cli`)

## Instalação

```bash
npm install
```

O npm workspaces instala tudo de uma vez e liga `@toliso/core` às duas aplicações.

## Variáveis de ambiente

Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha:

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | sim | Acesso ao DynamoDB |
| `AUTH_SECRET` | sim (para o app) | Assina o token de sessão do aplicativo mobile |
| `API_ALLOWED_ORIGIN` | não | Origem liberada no CORS da API (`*` em desenvolvimento) |
| `EXPO_ACCESS_TOKEN` | não | Só se o projeto Expo exigir autenticação no envio de push |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | não | Envio dos relatórios por e-mail |
| `NEXT_PUBLIC_APP_URL` | não | URL pública, usada pelo envio de relatórios |

Gere o `AUTH_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Como rodar

> Se o caminho do seu projeto tiver `&&` (dois "e comercial" seguidos) e algum comando falhar no Windows com `'&&' foi inesperado neste momento.`, veja [Caminho do projeto com e comercial e o npm no Windows](#caminho-do-projeto-com-e-comercial-e-o-npm-no-windows) — já está corrigido nos scripts abaixo, a nota é só para quem for rodar um binário novo manualmente.

As duas aplicações são independentes. **Você não precisa subir as duas ao mesmo tempo** — a única dependência é que, para usar o *aplicativo*, alguma instância da web precisa estar no ar (ela é quem serve a API); pode ser a de produção.

### Só a plataforma web

```bash
npm install
npm run web
```

Abre em `http://localhost:3000`. É tudo — o app mobile não entra na jogada.

Precisa de `apps/web/.env.local` com as credenciais da AWS. `AUTH_SECRET` só é exigido pelas rotas `/api/v1` (o aplicativo); a web em si funciona sem ele.

### Só o aplicativo

```bash
npm install
npm run mobile
```

Leia o QR code com o **Expo Go** (Android) ou rode `npm run mobile:android` num emulador.

Por padrão o app aponta para a produção (`https://toliso.hezo.dev.br`), então **ele funciona sozinho**, sem nada rodando na sua máquina.

Se quiser que ele converse com a web local, aí sim as duas precisam estar de pé:

1. `npm run web` numa aba;
2. no app, **Ajustes → Servidor**, informe `http://SEU_IP_NA_REDE:3000` (ex.: `http://192.168.1.10:3000`).

Use o IP da máquina na rede, **não** `localhost` — o celular não enxerga o `localhost` do computador. E defina `AUTH_SECRET` no `.env.local`, senão o login do app falha.

### Comandos disponíveis

| Comando | O que faz |
| --- | --- |
| `npm run web` | Web em desenvolvimento |
| `npm run web:build` / `npm run web:start` | Build de produção / servir o build |
| `npm run mobile` | Servidor do Expo (QR code) |
| `npm run mobile:android` | Roda em emulador/aparelho conectado |
| `npm run mobile:apk` | Gera o APK pelo EAS |
| `npm run typecheck` | Checa os três pacotes |

## Gerando o APK

```bash
npm run mobile:apk       # perfil "preview": APK instalável, build na nuvem do EAS
```

Antes do primeiro build:

1. `npx eas-cli login`
2. `npx eas-cli init` dentro de `apps/mobile` — isso substitui o `extra.eas.projectId` de exemplo (`00000000-...`) pelo id real do seu projeto.

Outros perfis disponíveis em `apps/mobile/eas.json`:

| Perfil | Saída | Uso |
| --- | --- | --- |
| `development` | APK com dev client | Depuração com código nativo |
| `preview` | APK | Distribuição interna / instalação manual |
| `production` | AAB | Publicação na Play Store |
| `production-apk` | APK | Release fora da Play Store |

Para compilar localmente (exige Android SDK + JDK 17):

```bash
npm run mobile:prebuild
cd apps/mobile && npx eas-cli build --platform android --profile preview --local
```

## Deploy na Vercel

O deploy publica **apenas a plataforma web**. Mudanças que tocam só o aplicativo não geram build.

Na configuração do projeto na Vercel:

| Campo | Valor |
| --- | --- |
| **Root Directory** | `apps/web` |
| **Include source files outside of the Root Directory** | ✅ ligado |
| Framework / Build / Install / Output | deixe no automático |

O "Include files outside" é obrigatório: sem ele a Vercel não enxerga `packages/core` nem o `package-lock.json` da raiz, e o build quebra na resolução de `@toliso/core`.

Com o Root Directory em `apps/web`, a Vercel detecta o Next.js sozinho e, por causa do `package-lock.json` com workspaces na raiz, roda o `npm install` a partir da raiz automaticamente. O resto vem de [apps/web/vercel.json](apps/web/vercel.json), que já está versionado:

- `framework: nextjs` — fixa o preset em vez de depender da detecção;
- `ignoreCommand` — cancela o build quando o commit não mexeu em `apps/web`, `packages/core`, `package.json` ou `package-lock.json`. Commits que só alteram o app mobile passam direto.

O [.vercelignore](.vercelignore) na raiz mantém `apps/mobile` fora do upload.

### Variáveis de ambiente na Vercel

Cadastre em *Settings → Environment Variables* as mesmas do `.env.example`. As indispensáveis:

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AUTH_SECRET` — sem ela as rotas `/api/v1` respondem erro e o aplicativo não consegue entrar
- `API_ALLOWED_ORIGIN` — em produção, prefira `*` mesmo: o app não envia `Origin`, e a API é protegida por token, não por CORS

> As funções ficam por padrão em `iad1` (Virgínia), que é a mesma região do DynamoDB `us-east-1`. Mudar para `gru1` (São Paulo) aproximaria do usuário, mas afastaria do banco — cada consulta pagaria a ida e volta. Só vale a pena se o banco também migrar.

## Notificações

O aplicativo usa duas fontes complementares:

**1. Push (servidor → aparelho)** — disparado pela plataforma web quando:
- alguém divide uma despesa com você;
- um administrador lança uma despesa na sua conta;
- um administrador registra um pagamento para você.

**2. Lembretes locais (agendados no próprio aparelho)** — funcionam mesmo sem internet:
- 3 dias e 1 dia antes de cada fatura **fechar**;
- 3 dias, 1 dia e no dia do **vencimento** de cada fatura em aberto.

Os lembretes são reagendados a cada sincronização, e só para faturas com saldo devedor.

### Tabela de tokens de push

O push precisa de uma tabela nova no DynamoDB, `pushTokensTL`, com chave de partição `token` (String):

```bash
aws dynamodb create-table \
  --table-name pushTokensTL \
  --attribute-definitions AttributeName=token,AttributeType=S \
  --key-schema AttributeName=token,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Sem essa tabela o aplicativo **continua funcionando normalmente** — apenas os avisos vindos do servidor não chegam; os lembretes locais seguem valendo.

As demais tabelas (`usersTL`, `cardsTL`, `transactionsTL`, `entriesTL`) já existem e não foram alteradas.

## API REST (`/api/v1`)

Servida pela própria plataforma web e consumida pelo aplicativo. Autenticação por token Bearer assinado com HMAC-SHA256 (`AUTH_SECRET`), válido por 30 dias e renovado a cada abertura do app.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Autentica e devolve o token |
| GET | `/auth/me` | Valida a sessão e renova o token |
| GET | `/summary` | Transações + pagamentos + cartões em uma requisição |
| GET | `/invoices` | Faturas e blocos de pagamento |
| GET/POST | `/transactions` | Listar / criar despesa |
| PATCH/DELETE | `/transactions/:id` | Editar (admin) / excluir |
| GET/POST | `/entries` | Listar / criar pagamento |
| DELETE | `/entries/:id` | Excluir pagamento |
| GET/POST | `/cards` | Listar / criar cartão (criar: admin) |
| PATCH/DELETE | `/cards/:id` | Editar / excluir cartão (admin) |
| GET/POST | `/users` | Listar / criar usuário (admin) |
| PATCH/DELETE | `/users/:id` | Editar / excluir usuário (admin) |
| GET | `/users/active` | Usuários ativos (para dividir despesas) |
| POST | `/push/register` | Registra o token de push do aparelho |
| POST | `/push/unregister` | Remove o token (logout) |
| POST | `/push/test` | Dispara uma notificação de teste |

Nenhuma resposta inclui a senha dos usuários.

## Design

As duas aplicações usam a mesma linguagem visual, *liquid glass*: fundo em gradiente com manchas de cor desfocadas e, sobre ele, superfícies translúcidas com desfoque, borda-fio de 1px e um filete de luz no topo.

- **Web**: tokens em `apps/web/app/globals.css` (`.glass`, `.glass-strong`, `.glass-soft`) aplicados aos primitivos de UI, então o estilo se propaga por todas as telas.
- **Mobile**: `apps/mobile/src/theme/tokens.ts` + o componente `<Glass>`, que combina `expo-blur` com o preenchimento translúcido.

Tema claro e escuro em ambas; no aplicativo há ainda a opção "Sistema".

## Seletor de data

Web e aplicativo usam o mesmo contrato de data, definido em [packages/core/src/date.ts](packages/core/src/date.ts):

- o valor guardado no formulário é sempre `YYYY-MM-DD`;
- a exibição é sempre `dd/mm/aaaa`;
- os dois têm os mesmos atalhos: **Hoje** e, onde a data é opcional, **Limpar**.

Na web, [`<DatePicker>`](apps/web/components/ui/date-picker.tsx) substituiu o `<input type="date">` nativo — que renderizava com a aparência do navegador e mostrava `mm/dd/yyyy` em máquinas com locale em inglês. No aplicativo, [`<DatePicker>`](apps/mobile/src/components/DatePicker.tsx) substituiu o campo em que era preciso digitar a data à mão.

**Sobre fuso horário:** `new Date("2025-08-31")` é interpretado como meia-noite **UTC**, que no Brasil (UTC-3) cai no dia 30 — uma data escolhida como 31/08 era salva e reexibida como 30/08. Toda conversão passa agora por `fromISODate`/`toTimestamp`, que ancoram a data ao **meio-dia local**, preservando o dia em qualquer fuso. Isso também evita que uma despesa lançada no dia do fechamento caísse no período errado.

## Segurança das dependências

`npm audit` saiu de **28 alertas (13 moderate, 14 high, 1 critical)** para **5, todos moderate**. Nenhuma high, nenhuma critical.

**O que foi feito:**

1. **Next.js `15.2.6` → `15.5.25`** — a versão anterior tinha aviso de segurança do npm (*Cache Key Confusion* na API de otimização de imagens) e arrastava um `sharp` vulnerável.

2. **Expo SDK `52` → `57` e React Native `0.76` → `0.86`** — trouxe `cacache`, `metro` e `xcode` atualizados, eliminando de uma vez o `tar` (critical), o `image-size` e a maior parte das high. Feito com `expo install --fix`.

3. **`overrides` na raiz**, todos dentro da major declarada por quem consome, então nenhuma API muda:
   - `postcss` → `^8.5.26`
   - `@xmldom/xmldom` → `^0.8.15` — teto em `0.8.x` de propósito: o `@expo/plist` chama `new DOMParser({ errorHandler })`, opção removida no `0.9`
   - `uuid` → `^11.1.1` — único consumidor é o `xcode`, que faz `require('uuid').v4()`, padrão validado contra a v11

**Efeitos colaterais bons da migração:**

- **Uma única cópia de React.** Antes o React Native exigia React 18 e a web React 19, o que obrigava a fixar versões na raiz para separar as árvores. Agora ambos usam React 19.2.3 — o `paths` que redirecionava `@types/react` no `tsconfig` da web foi removido, e o total de pacotes caiu de **1.144 para 836**.
- **`react-native-reanimated` removido.** O app nunca o usou (as animações são feitas com a API `Animated` do próprio React Native). Mantê-lo exigiria migrar para a v4, que depende de `react-native-worklets`. O bundle Android caiu de **4,23 MB para 3,4 MB**.
- **`metro.config.js` simplificado** para uma linha: o `getDefaultConfig` do Expo já resolve o monorepo sozinho.

**As 5 restantes:**

Todas moderate e todas na mesma cadeia: `expo-router` → `query-string` → **`decode-uri-component`** (negação de serviço por decodificação exponencial). A correção seria a `0.5.0`, mas ela é **ESM-only** (`"type": "module"`) e o `query-string` que o expo-router usa é CommonJS — o override quebraria o roteador com `ERR_REQUIRE_ESM`. Fica aguardando o expo-router subir o `query-string`.

Exposição real: ferramenta de build e parsing de URL interno do roteador, com entradas que você controla. Nada disso é alcançável por um usuário do app.

### Sobre o TypeScript

O SDK 57 sugere TypeScript 6, mas ele está fixado em **5.9.3** e declarado em `expo.install.exclude`. O Next.js 15.5 ainda não suporta o TS 6 (falha ao resolver a declaração do `import "./globals.css"`), e o `tsc` é compartilhado com a web pelo hoisting do workspace. Volta a alinhar quando o Next suportar.

### Validação da migração

O que foi verificado automaticamente:

| Verificação | Resultado |
| --- | --- |
| `tsc --noEmit` nos três pacotes | limpo |
| `next build` | compila, 20 rotas |
| Bundle do Metro (Android) | 3,4 MB, com `@toliso/core` embutido |
| `expo-doctor` | 21/21 |
| Tela de login renderizada no navegador | ok, claro e escuro |

**O que falta:** rodar o app em um aparelho. Cinco majors de SDK mudam comportamento de runtime (nova arquitetura obrigatória, `expo-router` v6, ciclo de vida da splash) que build e typecheck não capturam. Antes de publicar, gere um APK do perfil `preview` e valide login, criação de despesa parcelada/dividida, faturas e notificações.

## Caminho do projeto com e comercial e o npm no Windows

Se `npm run web` (ou qualquer script que rode uma CLI instalada via npm) falhar no Windows com:

```
'&&' foi inesperado neste momento.
```

a causa é o caminho do projeto conter dois "e comercial" seguidos, como em `C:\Projetos\&&&&\toliso`. Todo shim `.cmd` que o npm gera em `node_modules/.bin` (para `next`, `tsc`, `expo`, `eslint`, qualquer CLI) contém a linha `SET dp0=%~dp0`, **sem aspas**. Quando `%~dp0` expande para um caminho com `&&`, o `cmd.exe` lê isso como dois operadores de encadeamento sem nenhum comando entre eles — dessa forma erra por sintaxe, antes mesmo de a ferramenta rodar. Não é bug do Next, do Expo, nem deste projeto: é uma limitação do próprio interpretador de lote do Windows, e afeta qualquer instalação do npm nesse caminho.

**A correção está em [scripts/run-bin.js](scripts/run-bin.js)**, já aplicada aos scripts de `apps/web`, `apps/mobile` e `packages/core`. Em vez de deixar o `cmd.exe` resolver `next`/`tsc`/`expo` pelo `PATH` (o que aciona o shim quebrado), os scripts chamam `node` diretamente sobre o arquivo do pacote:

```json
"dev": "node ../../scripts/run-bin.js next/dist/bin/next dev"
```

`node.exe` é um executável de verdade, não um arquivo de lote — o `cmd.exe` nunca abre nem interpreta o seu conteúdo, só o inicia. Validado rodando `npm run web`, `npm run mobile` e `npm run typecheck` de ponta a ponta neste mesmo caminho.

**Exceção: `npm run mobile:apk` e variantes.** Esses continuam chamando `eas` (via instalação global, como já era antes). Funcionam normalmente porque uma instalação **global** do npm fica em `%APPDATA%\npm`, fora da pasta do projeto — o `%~dp0` do shim aponta para lá, não para o caminho com `&&`, então o bug não se manifesta. (Cheguei a testar trazer o `eas-cli` para dentro do projeto para aplicar a mesma correção, mas ele reintroduzia 13 vulnerabilidades — inclusive o `tar` crítico que acabara de ser eliminado — então não valeu a troca para um comando de uso ocasional.)

Se algum dia você adicionar uma ferramenta nova que rode via `.cmd` (ex.: `eslint`, `jest`), aplique o mesmo padrão: descubra o campo `bin` do pacote (`npm view <pacote> bin`) e chame via `node ../../scripts/run-bin.js <pacote>/<caminho-do-bin> [args]` em vez do nome nu.

## Verificação

```bash
npm run typecheck    # core + web + mobile
npm run web:build    # build de produção da web
```

> No Windows, se o caminho do projeto tiver `&` e algum comando fora destes dois falhar com `'&&' foi inesperado neste momento.`, veja [Caminho do projeto com e comercial e o npm no Windows](#caminho-do-projeto-com-e-comercial-e-o-npm-no-windows).
