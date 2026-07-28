# CI — Gates Obrigatórios de Qualidade

> Etapa Zero da decisão **D-047** (`docs/DECISIONS.md`). Implementa a integração contínua que hoje não existe: o repositório tem *deploy* contínuo (Vercel), mas nada impede que código com lint quebrado, tipo inválido ou teste vermelho chegue à `main`.

## Finalidade

Impedir que código quebrado chegue à branch principal. Antes desta CI, os 210 testes só rodavam se alguém lembrasse de executá-los localmente.

**CI e CD são processos distintos.** Este workflow **não faz deploy**, não publica nada e não toca em nenhum ambiente. O deploy continua sendo responsabilidade da Vercel (`docs/DEPLOY.md`). A CI é o portão; o CD é a esteira depois do portão.

## Gatilhos

| Evento | Quando |
|---|---|
| `pull_request` → `main` | Toda PR direcionada à branch principal |
| `push` → `main` | Merge ou push direto na principal |
| `workflow_dispatch` | Execução manual, sob demanda |

Não usa `pull_request_target` — esse gatilho executa código de fork com o token do repositório base e é uma via clássica de exfiltração de segredo.

## Comandos executados

Na ordem, todos em `app/` (mesma Root Directory da Vercel):

| # | Etapa | Comando | Por que nesta posição |
|---|---|---|---|
| 1 | Instalação | `npm ci` | Determinística; falha se o lockfile divergir do `package.json` |
| 2 | Migrations | `npm run migrations:check` | Barato e rápido; erro de migration é caro depois de aplicado |
| 3 | Lint | `npm run lint` | Feedback rápido antes das etapas lentas |
| 4 | TypeScript | `npx tsc --noEmit` | Verifica tipos sem gerar artefato |
| 5 | Testes | `npm test` | 210 testes |
| 6 | Build | `npm run build` | Mais lento; só faz sentido se tudo acima passou |

Todos são os comandos canônicos já existentes no `package.json` — nenhum comando alternativo foi inventado.

### Verificação de migrations

`app/scripts/check-migrations.mjs` — **read-only, sem banco**. Não conecta ao Supabase, não executa SQL, não aplica migration.

Valida: diretório existe; arquivos `.sql` não vazios; padrão `<timestamp14>_<nome_snake_case>.sql`; timestamp é data real (rejeita mês 13, 31/02); sem timestamps duplicados; sem nomes duplicados; ordem alfabética idêntica à cronológica; todos legíveis; nenhum arquivo não-SQL no diretório.

Cada uma dessas verificações foi exercitada contra um caso de falha real antes de entrar na CI.

## Required check

**Nome: `IAH Quality Gate`**

Nome estável, definido em `jobs.quality-gate.name`. É o identificador a selecionar na configuração de branch protection do GitHub. Alterar esse nome quebra a regra de proteção silenciosamente — a regra passa a apontar para um check que não existe mais, e o merge volta a ser liberado.

## Segurança

| Controle | Estado |
|---|---|
| `permissions` | `contents: read` — mínimo possível |
| Segredos | Nenhum. O workflow não referencia `secrets.*` |
| Banco de dados | Nenhum acesso. Sem Supabase, sem CLI vinculada |
| Migrations | Nunca aplicadas — apenas verificação estática |
| Deploy / push | Nenhum |
| `pull_request_target` | Não utilizado |
| `persist-credentials` | `false` no checkout |
| Versões das actions | Fixas (`actions/checkout@v4`, `actions/setup-node@v4`) |
| Timeout | 20 minutos |
| Concurrency | `cancel-in-progress` por ref |

### Build sem variáveis de ambiente

O build roda sem nenhum segredo, e isso foi **verificado empiricamente** nesta implementação, não presumido: `next.config.ts` calcula `NEXT_PUBLIC_IAH_REAL_MODE` a partir de variáveis ausentes, resolve para `"false"`, e a aplicação compila em modo demonstração. Nenhum serviço remoto é contatado.

Consequência: a CI não precisa de `.env.local`, `.env.development.local`, `service_role`, `project-ref` nem valor sintético algum.

## Ambiente

- **SO:** `ubuntu-latest`
- **Node:** `22` — obrigatório, não preferência. O `npm test` usa `--experimental-strip-types`, que não existe no Node 20.
- **Package manager:** npm, com `package-lock.json` versionado
- **Cache:** `cache: npm`, com `cache-dependency-path: app/package-lock.json`

## Configuração manual necessária no GitHub

O workflow sozinho **não bloqueia merge**. Ele reporta status; quem bloqueia é a regra de proteção da branch. Sem o passo abaixo, a CI roda, falha, e o merge continua permitido.

1. **Settings** → **Branches** (ou **Rulesets**)
2. Criar/editar regra para `main`
3. Exigir **pull request** antes do merge
4. Exigir **status checks** aprovados
5. Selecionar **`IAH Quality Gate`**
6. Impedir merge quando o check falhar

Isso é feito no painel do GitHub, pelo responsável pelo repositório. Não foi configurado remotamente por esta tarefa.

## Relação com a Vercel

A Vercel faz deploy automático a cada push na `main` (`docs/DEPLOY.md`). Depois da configuração acima, a `main` só recebe mudanças via PR com o check aprovado — ou seja, a Vercel deixa de receber código que não passou pelos gates.

Enquanto o passo manual não for feito, o gate existe mas não protege nada.
