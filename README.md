# Quennie · Backoffice

Backoffice do estúdio Quennie Interior Design: projetos, inspirações (moodboard), clientes, biblioteca de produtos, agenda e faturas.

Valores em francos CFA (FCFA, sem casas decimais). IVA por omissão nas novas faturas: 19% (`DEFAULT_VAT` em `src/lib/format.ts`), editável por fatura.

TanStack Start (React 19, SSR + server functions), Tailwind CSS 4, Motion. Mesma identidade visual do site público (linho / nogueira / marfim, Cormorant Garamond + Jost).

```bash
pnpm install
pnpm dev     # http://localhost:3003
pnpm build
```

## Dados e acesso (Supabase)

Os dados vivem no Supabase (projeto definido em `.env`, ver `.env.example`):

1. **SQL Editor** → correr `supabase/setup.sql`: cria as tabelas (uma por coleção, registo em JSON na coluna `data`),
   as regras de acesso (RLS: só utilizadores com `app_metadata.role = 'staff'`) e o bucket `media` para as fotografias.
2. **Authentication → Users → Add user**: `melissa@quennie.app`, palavra-passe à escolha, "Auto Confirm User".
   Depois voltar a correr a última instrução de `setup.sql` (marca a conta como `staff`).
3. Opcional: `supabase/seed-demo.sql` carrega os dados de demonstração (`pnpm seed:sql` para o regenerar).
4. Recomendado: desativar "Allow new users to sign up" em Authentication → Sign In / Providers.

O login aceita um nome curto: `melissa` → `melissa@quennie.app` (domínio em `VITE_AUTH_EMAIL_DOMAIN`).
O servidor verifica a sessão com `getClaims()` em cada leitura e escrita (`src/server/auth.ts`, `src/server/workspace.ts`).

## Deploy (Vercel)

Build com Nitro (`nitro/vite`), que gera a saída Vercel automaticamente. No projeto Vercel definir
`VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (e opcionalmente `VITE_AUTH_EMAIL_DOMAIN`).

## Inspirações

`/inspiracoes` é o moodboard: fotos organizadas por coleção, com paleta de cores, etiquetas e ligação a um projeto.
No telemóvel, "Tirar foto" abre a câmara; a imagem é reduzida (WebP, 1400 px) e as cores dominantes são lidas
automaticamente (`src/lib/image.ts`). `/inspiracoes?novo=true` abre logo o formulário (atalho no ecrã inicial e na app instalada).

## Fotografias dos projetos

No detalhe de cada projeto, a galeria guarda as fotos por etapa (Antes, Obra, 3D, Depois), tiradas no telemóvel
ou escolhidas da galeria. Cada foto é reduzida (WebP, 1800 px) e enviada sozinha (`uploadMedia` em
`src/server/workspace.ts`), por isso uma série de fotos nunca ultrapassa o limite de tamanho dos pedidos.
Com fotos "Antes" e "Depois", aparece um comparador. Qualquer foto pode passar a capa ou dar origem a uma publicação.

## Pedidos (site → backoffice)

`/pedidos` reúne os pedidos de orçamento. O formulário `/orcamento` do site público chama a função
`public.submit_lead` (em `supabase/setup.sql`): valida os campos, ignora bots (campo escondido) e envios
repetidos, e grava o pedido. O site não consegue ler nada. No site, definir `VITE_SUPABASE_URL` e
`VITE_SUPABASE_KEY` com os mesmos valores do backoffice. Pedidos recebidos por Instagram ou telefone
registam-se à mão. Um pedido converte-se em cliente + projeto (briefing já preenchido).

## Marketing

`/marketing` tem três separadores:

- **Campanhas**: escolher o público (clientes ou pedidos, por estado, cidade, tempo sem contacto) e um modelo;
  cada mensagem abre já escrita no WhatsApp (`wa.me`) ou no email (`mailto:`), e fica registada no histórico.
  Sem API nem custos por mensagem: sai do WhatsApp do estúdio.
- **Modelos de mensagem**: textos com variáveis `{nome}`, `{primeiro_nome}`, `{projeto}`, `{cidade}`, `{servicos}`.
  Enquanto o estúdio não guardar os seus, aparecem modelos sugeridos (`src/lib/outreach.ts`).
- **Redes sociais**: publicações com fotos dos projetos, legenda gerada, hashtags, plataformas e data.
  No telemóvel, "Partilhar" envia fotos e legenda para Instagram, Facebook ou WhatsApp.

Depois de atualizar o código, voltar a correr `supabase/setup.sql` (cria `leads`, `templates`, `outreach`,
`posts` e a função `submit_lead`). Até lá, estes módulos aparecem vazios.
