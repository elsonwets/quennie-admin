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
