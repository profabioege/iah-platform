# Produto — Arquitetura Funcional do IAH

Fonte oficial e única de verdade sobre **como o produto é construído hoje**: arquitetura, módulos, Design System, identidade visual, fluxos e componentes. Para *por que* o produto existe, ver `VISION.md`. Para *quando* cada peça foi decidida, ver `DECISIONS.md`. Para *o que falta*, ver `STATUS.md` e `ROADMAP.md`.

## Arquitetura funcional

Um único projeto **Next.js 15 (App Router)** hospeda dois blocos de produto que compartilham o mesmo Design System:

```
IAH - Educacional/
├── app/                    ← aplicação Next.js (código-fonte único do produto)
├── docs/                   ← esta documentação
├── assets/                 ← recursos de marca/mídia (reservado)
├── wordpress-theme/        ← tema WordPress: artefato de publicação temporário
└── CLAUDE.md               ← regras gerais de desenvolvimento
```

### Rotas (`app/src/app`)

```
src/app/
├── layout.tsx                      ← raiz compartilhada: <html>, fontes, metadata base
├── globals.css                     ← ponte Tailwind → tokens
├── icon.svg, robots.ts, sitemap.ts ← SEO/identidade, nível de aplicação
├── entrar/page.tsx                 ← abertura da Plataforma (sem auth ainda) → /entrar
├── (marketing)/                    ← SITE INSTITUCIONAL (bloco público)
│   ├── layout.tsx                  ← metadata de marketing (title, OG, canonical)
│   ├── page.tsx                    ← landing → /
│   ├── contato/page.tsx            ← formulário de demonstração → /contato
│   └── opengraph-image.tsx         ← imagem de compartilhamento gerada
├── (platform)/                     ← PLATAFORMA IAH (sistema de ensino)
│   ├── layout.tsx                  ← App Shell (sidebar + header), tema Premium Dark
│   ├── dashboard/page.tsx          ← Missão ativa + progresso real → /dashboard
│   ├── missoes/page.tsx            ← lista de Missões → /missoes
│   ├── missoes/[id]/page.tsx       ← detalhe da Missão + workspace do aluno
│   ├── diario/page.tsx             ← Diário do Auditor (reflexões) → /diario
│   └── professor/page.tsx          ← Painel do Professor → /professor
└── api/
    └── contato/route.ts            ← envio de e-mail via Resend (dormente até RESEND_API_KEY)
```

Route groups (`(marketing)`, `(platform)`) não aparecem na URL — dão a cada bloco seu próprio layout/metadata sem duplicar a raiz. `/entrar` fica fora dos dois grupos, com seu próprio layout de abertura.

- **`(marketing)`** — público, sem autenticação. Todos os CTAs "Solicitar Demonstração" apontam para `/contato`; o link "Entrar" no header leva a `/entrar`.
- **`(platform)`** — sistema de ensino. É aqui que a futura autenticação entra. Toda nova tela nasce como rota dentro deste grupo, herdando o App Shell automaticamente.
- **`api/`** — Route Handlers de servidor. Hoje: `contato`. Novas integrações (Supabase, IA, externas) seguem o mesmo padrão: uma pasta por recurso.

### Componentes

```
src/components/
├── ui/          ← biblioteca única de componentes (shadcn/ui) — usada pelos DOIS blocos
├── brand/       ← componente Logo (marca oficial IAH), usado em ambos os blocos
├── layout/      ← composições exclusivas da Plataforma (sidebar, header, menu de acessibilidade)
└── marketing/   ← composições exclusivas da Landing (navegação, formulário, rodapé)

src/lib/         ← utilitários e configuração (site.ts, utils.ts)
src/modules/     ← módulos de domínio (ver "Módulos existentes" abaixo)
src/content/     ← conteúdo pedagógico versionado em arquivo (missões)
src/styles/      ← tokens.css, fonte única de verdade do Design System
```

Regra de dependência: `layout/` e `marketing/` podem importar de `ui/` e `brand/`; nunca o inverso. `ui/` e `brand/` não conhecem Landing nem Plataforma.

### Estratégia de crescimento (regras obrigatórias)

1. Novas telas da Plataforma entram sob `(platform)/`, herdando o App Shell — nunca duplicam sidebar/header.
2. Novas páginas públicas entram sob `(marketing)/`.
3. Novo domínio de negócio vira um novo diretório em `src/modules/`, com camada `domain/` (entidades + contratos) separada de `infrastructure/` (implementação atual — hoje localStorage/simulada, amanhã banco).
4. Nenhuma cor, fonte, raio ou sombra nova é declarada fora de `tokens.css`.
5. Multi-tenancy (Escola) é restrição de domínio, não só de banco — qualquer funcionalidade que toque dados de aluno/professor considera o escopo de Escola desde o desenho.
6. WordPress é temporário — nenhuma funcionalidade nova de marketing é construída lá.
7. Autenticação/Supabase ainda não existem; quando entrarem, a barreira se instala no layout de `(platform)/`, sem mudar a Landing.
8. **Uma nova Missão = um novo arquivo em `src/content/missions/` registrado no índice.** Nenhum componente de interface muda.
9. **Toda fonte de dados simulada/local implementa o mesmo contrato (`Reader`/`Repository`) que a futura fonte real.** Trocar a fonte é trocar uma injeção, nunca a UI.

## Módulos existentes

| Módulo | Contexto | Entidades / contratos | Fonte atual dos dados |
|---|---|---|---|
| `modules/library` | Currículo & Autoria | `Mission`, `MissionReader`/`MissionRepository` | `local-mission-repository` — lê `src/content/missions/*` |
| `modules/classroom` | Aprendizagem & Entrega | `StudentWork` (produção + reflexão do aluno), `ClassMonitorReader`/`StudentMissionSnapshot` (acompanhamento de turma) | `local-student-work-store` (localStorage, por aluno/dispositivo) e `simulated-class-monitor` (turma **simulada**, 11 alunos fictícios, autorizada para demonstração) |

Cada módulo segue o padrão: `domain/` (contratos + entidades, sem UI nem banco) e `infrastructure/` (implementação atual). Novos contextos (Identidade & Acesso, Instituição, Colaboração, Acervo, Operação) nascem conforme as Sprints do `ROADMAP.md` os exigirem, seguindo este mesmo padrão. Modelo de domínio completo (todas as entidades do produto, inclusive as ainda não implementadas): ver `DOMAIN_MODEL.md`.

## Design System

Fonte única de verdade: **`app/src/styles/tokens.css`**, em duas camadas:

- **Primitivas da marca** (`--iah-*`): escala navy (`--iah-navy-950` a `-600`, fundo escuro predominante), cyan (`--iah-cyan-400` `#42e8f1`, cor primária), teal (variante legível em fundo claro), acentos de apoio (verde/violeta/âmbar/vermelho), superfícies claras (`paper`/`mist`/`white`), texto/bordas (`ink`/`fog`/`slate`, `line`/`line-dark`).
- **Tokens semânticos**: contrato shadcn/ui (`--primary`, `--background`, `--card`, `--sidebar-*`...), tema claro em `:root` e Premium Dark em `.dark`. Nenhuma cor nova é declarada fora deste arquivo — mudar a marca é editar um único lugar, que propaga para Landing e Plataforma.

Tipografia: **Geist** (sans) para toda a interface, **Geist Mono** para rótulos técnicos (eyebrows, badges). Detalhe completo de organização e regras de consumo: `DESIGN_SYSTEM.md`.

## Identidade visual

- **Logo oficial**: componente `Logo` (`components/brand/logo.tsx`) — SVG isolado num único arquivo, variantes clara/escura (`variant="dark"`/`"light"`/`"auto"`, letras em `currentColor`) e wordmark "EDUCACIONAL" opcional. Aplicado em sidebar da Plataforma, header/rodapé do site, tela `/entrar`, favicon e Open Graph. Trocar pelo vetor oficial = editar só o `<svg>` deste arquivo.
- **Tema**: Premium Dark é a identidade visual principal e único tema efetivamente ativo hoje. Tokens do tema claro já existem (suporte planejado), mas sem alternância funcional na interface ainda.
- **Tom de voz e glossário de marca** (Auditor(a) da Realidade, Missão, Diário do Auditor, Laboratório etc.), regras de nomenclatura e conceitos proibidos ("AVA", "LMS", hype de IA): ver `03_BRAND_GUIDELINES.md`.

## Fluxos principais

**Jornada do aluno (piloto de agosto):**
`/entrar` → `/dashboard` (Missão ativa + progresso real) → `/missoes/[id]` (ler os 11 blocos da Missão) → Produção (autosave, entrega) → Reflexão (liberada após a entrega, autosave, registro) → banner "Aula concluída" → volta ao `/dashboard` (badge "Missão concluída") → `/diario` (reflexão listada).

**Jornada do professor (piloto de agosto):**
`/entrar` → `/professor` — lista de alunos com 8 estados (não acessou/visualizou/investigando/produzindo/rascunho/entregue/reflexão/concluiu), contadores por status que funcionam como filtro, último acesso, abertura inline de produção e reflexão de cada aluno. Fonte de dados hoje é simulada (ver Módulos existentes); trocar por dados reais não muda esta tela.

**Jornada comercial (mantenedor/diretor):**
Landing (`/`) → "Entrar" (demonstração da Plataforma) ou "Solicitar Demonstração" → `/contato` (formulário + e-mails institucionais `contato@`/`comercial@iaheducacional.com.br`).

## Regras de UX

- **Dark-first.** Toda tela nova é desenhada para Premium Dark primeiro.
- **Estética de laboratório, não de SaaS corporativo.** Sem fotos de banco de imagens, sem telas de produto fictícias/simuladas na Landing.
- **App Shell consistente na Plataforma.** Sidebar fixa + header, responsiva (painel deslizante no mobile) — nunca reinventar navegação por tela.
- **Itens de navegação ainda não construídos são honestos sobre isso**: recebem selo "Em breve" e ficam desabilitados — nunca um item clicável que não faz nada.
- **Sem flash de conteúdo vazio.** Toda tela que lê estado no cliente (localStorage) mostra um esqueleto de carregamento (`Skeleton`) equivalente ao layout final, nunca uma `main` vazia.
- **Acessibilidade como parte do desenho**: alvos de toque ≥44px, contraste AA no mínimo, hierarquia clara de heading.
- **Mobile-first nas revisões**: toda tela nova é validada em viewport mobile antes de considerada pronta; e em notebook/projetor (1366×768, 1024×768) antes de qualquer demonstração comercial.
- **Nenhuma tela ou dado fictício sem identificação explícita.** Dados simulados (ex.: turma do Painel do Professor) são rotulados como tal na própria interface.

## Componentes reutilizáveis

- **`components/ui`** — biblioteca shadcn/ui compartilhada: `Button`/`buttonVariants` (usar `buttonVariants` + `<Link>` para navegação, nunca `Button` com `render`, que gera aviso de acessibilidade no Base UI), `Card`, `Badge`, `Skeleton`, `Sidebar`, `Avatar`, `Separator`, `Sheet`, `Tooltip`, `Input`, `DropdownMenu`.
- **`components/brand/logo.tsx`** — `Logo`, ver Identidade visual acima.
- **`components/layout`** — `AppSidebar` (menus com estado ativo por URL + selo "Em breve"), `AppHeader`, `AccessibilityMenu` (interface pronta; efeitos ainda não persistem).
- **`components/marketing`** — `SiteNav` (com link "Entrar" + CTA "Solicitar Demonstração"), `SiteFooter`, `DemoForm` (Resend, dormente), `ContactForm` (mailto, ativo hoje).

## Referências complementares

- `MISSION.md` / `MISSION_TEMPLATE.md` — estrutura padrão de uma Missão e guia de autoria para professores.
- `DOMAIN_MODEL.md` — modelo de domínio completo (todas as entidades do produto).
- `DESIGN_SYSTEM.md` — organização detalhada dos tokens e regras de consumo.
- `03_BRAND_GUIDELINES.md` — glossário de marca, tom de voz, conceitos proibidos.
- `DEPLOY.md` — processo de versionamento e publicação (Git → GitHub → Vercel).
