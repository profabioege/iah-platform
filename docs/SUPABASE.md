# Supabase — IAH Educacional

Guia de criação e configuração do projeto Supabase (PostgreSQL) — o banco real da plataforma, decidido em `PERSISTENCE.md`/D-023. Este documento é o passo a passo do que **só você** pode fazer (contas e consoles são seus); todo o código que consome o banco já está pronto e ligado por variáveis de ambiente.

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) → New project (organização pessoal, plano Free basta para o piloto).
2. Nome sugerido: `iah-platform`. Região: `sa-east-1` (São Paulo). Guarde a senha do banco.

## 2. Aplicar as migrations (na ordem)

No SQL Editor do Supabase, execute o conteúdo de cada arquivo, **nesta ordem**:

1. `app/db/migrations/0001_initial_schema.sql` — schema institucional multi-tenant.
2. `app/db/migrations/0002_classroom_sync_state.sql` — estado de sincronização de turmas.
3. `app/db/migrations/0003_identity.sql` — usuários, perfis, campos institucionais (slug/logo/domínio).

Nenhuma migration insere dados: o banco nasce vazio, como decidido (dados de demonstração vivem só em memória — `PERSISTENCE.md`).

## 3. Inserir a SUA Instituição (única linha manual)

A plataforma nunca cria instituições sozinha (D-025). Insira a linha da sua escola no SQL Editor — ajuste os valores reais:

```sql
insert into institutions (id, name, slug, domain, status)
values (
  'inst-beryon',           -- id estável, minúsculas, sem espaços
  'Colégio Beryon',        -- nome exibido
  'beryon',                -- slug usado em AUTH_DEFAULT_INSTITUTION_SLUG
  null,                    -- domínio de e-mail institucional (opcional)
  'active'
);
```

`logo_url` pode ser preenchido depois. O valor de `slug` deve ser idêntico ao da variável `AUTH_DEFAULT_INSTITUTION_SLUG`.

## 4. Copiar as chaves

Em Project Settings → API:

| Variável | Onde encontrar | Cuidado |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública, ok |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | pública, protegida por RLS futura |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **SECRETA — ignora RLS; só servidor, nunca NEXT_PUBLIC** |

Defina as três em `app/.env.local` (dev) e no painel da Vercel (produção), junto com as de autenticação (`AUTHENTICATION.md`).

## 5. O que já está implementado sobre este banco

- **Provisionamento de identidade** (`modules/identity`): no primeiro login, grava `users`, liga/cria `teachers` e cria `profiles` — as únicas queries reais já escritas, exercitadas no primeiro login.
- **Demais repositórios** (`modules/platform/infrastructure/database/database-repositories.ts`): ainda stubs — implementá-los é o passo 3 do checklist Mock → Banco Real de `PERSISTENCE.md`.

## 6. RLS (Row Level Security) — próximo passo de segurança

As tabelas nascem sem políticas RLS porque o único acesso hoje é o client administrativo do servidor (service role). Antes de qualquer acesso client-side com a anon key, ativar RLS por `institution_id` amarrado ao usuário autenticado (passo 5 do checklist de `PERSISTENCE.md`). Não ativar RLS sem políticas — bloquearia tudo.

## 7. Verificação pós-setup

Depois do primeiro login real, confira no Table Editor:

- `users`: 1 linha com seu e-mail e `last_login_at` preenchido.
- `teachers`: 1 linha ligada ao seu `user_id`.
- `profiles`: 1 linha `role = 'professor'` na sua instituição.

Se o login falhar, os logs da Vercel (Functions) mostram o motivo exato — as mensagens de erro do provisionamento nomeiam o que faltou (slug inexistente, variável ausente etc.).
