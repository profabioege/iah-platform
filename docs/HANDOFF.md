# HANDOFF — IAH Educacional

> **Retomada após a M21 — Ciclo Institucional de Aprendizagem (20/07/2026):**
> a jornada Gestor → Professor publica → Aluno realiza e entrega → Professor
> avalia → Aluno recebe devolutiva → Gestor vê indicadores está completa e
> demonstrável no cenário oficial (Instituto Horizonte, 2º EM A, Lesson
> "Desinformação e verificação de fontes", Mission 01). Estados: Mission
> draft→published→closed; entrega not_started→in_progress→submitted→reviewed
> (derivada dos dados, `getStudentSubmissionStatus`). A demonstração pressupõe
> um único navegador (o trabalho do aluno vive em `localStorage` isolado por
> instituição/aluno; adapters locais espelham publicações e avaliações da
> sessão). O bloqueador para uso com alunos reais segue sendo banco +
> autenticação real (checklist em `PERSISTENCE.md`). Validação completa na
> build de produção; ver `CHANGELOG.md` (M21) para o detalhe.

Documento único de transição de contexto. Escrito para que uma nova conversa (ou uma nova pessoa) retome o projeto sem precisar reconstruir nada do histórico. Se este documento divergir do código, o código manda — mas a divergência deve ser corrigida aqui.

Para o dia a dia, os documentos vivos continuam sendo `VISION.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md` e `DECISIONS.md` (`CHANGELOG.md` para o histórico entrega-a-entrega). Este HANDOFF é o resumo de entrada única; aqueles são a fonte de verdade contínua. Referências técnicas complementares: `DOMAIN_MODEL.md` (modelo institucional completo), `IMPORT_ARCHITECTURE.md` (importação de Turma/Aluno de origens externas), `AUTHORING_MODEL.md` (motor de autoria de Missões), `PERSISTENCE.md` (arquitetura de persistência multi-tenant, seeds, checklist Mock → Banco Real) e `KNOWLEDGE_ENGINE.md` (Biblioteca Inteligente — entidades, metadados, busca, integrações futuras) — consultar antes de qualquer Sprint que envolva Instituição/Turma/Aluno/Professor/integração/autoria/banco/Biblioteca além do que já existe hoje.

> **Nota:** este projeto não tem (nem deve ter) um `MASTER.md`. Se uma Sprint pedir para atualizá-lo, o documento equivalente é este `HANDOFF.md` — "documento único de transição de contexto" já é a definição de um master doc (ver `DECISIONS.md` D-018, D-021).

---

## 1. Visão geral do projeto

**IAH (Inteligência Artificial & Humanidades)** é um sistema de ensino — não um AVA, não um chatbot — para a disciplina de IA no Ensino Médio. O estudante assume o papel de **Auditor da Realidade**: investiga, verifica evidências e produz conhecimento, usando IA como objeto de estudo e apoio crítico, nunca como fonte de resposta pronta.

**Objetivo comercial que organiza tudo hoje:** fechar um piloto com o mantenedor da escola onde o fundador já leciona a disciplina, em **agosto/2026**. Toda decisão de produto responde primeiro: *"isso melhora a demonstração/o uso real em sala de aula em agosto?"*

Detalhes completos de propósito, público-alvo, diferenciais e critérios de aceitação de funcionalidades: `VISION.md`.

## 2. Estado atual do produto

Dois blocos, um único projeto Next.js:

- **Site Institucional (Landing)** — pitch comercial completo: Hero desambiguada, seções de diferenciais/como funciona/implantação/confiança, e um funil de conversão dedicado em `/demonstracao`.
- **Plataforma IAH** — executa uma jornada completa de aula para a Missão 01 ("A Fábrica de Notícias", com Dossiê de Auditoria completo): aluno entra pelo login institucional, vê a missão ativa, investiga, produz, reflete, conclui; professor acompanha a turma num painel dedicado; gestor tem um painel institucional próprio.

**Desde a M15, toda a Plataforma exige login** — autenticação **local simulada** do Institutional Workspace (`modules/workspace`): contas do Colégio Beryon (diretor@/fabio@/aluno01–10@colegioberyon.com.br — domínio padronizado na M18, lido de `Institution.domain`), senha única de demonstração exibida na tela de login, papel identificado automaticamente, rotas protegidas por papel no middleware. A autenticação real (Auth.js + Google, M07) segue pronta/dormente e tem precedência quando configurada. **Desde a M17, existe o fluxo completo de aprendizagem** (`/professor/turmas`): Professor publica a Mission de uma Lesson para uma Turma real, Aluno vê "Minha Lesson" e faz a Missão, Professor acompanha com dados reais — nenhum dado do acompanhamento vem mais de `simulated-class-monitor` (removido). Nenhum banco de dados. Persistência do aluno em `localStorage` do dispositivo; turmas e acompanhamento vêm do seed institucional Beryon (dados fictícios autorizados, rotulados).

Estado minuto-a-minuto (último commit, último deploy, lacunas, riscos, próxima tarefa): **sempre consultar `STATUS.md`** — é o documento mais atualizado e não duplicado aqui.

## 3. Arquitetura

Aplicação **Next.js 15 (App Router)** com servidor (Node/Vercel), route groups separando os dois blocos sem afetar a URL:

- `(marketing)` — bloco público. `/` (Landing), `/demonstracao` (funil de conversão principal), `/contato` (formulário legado, sem links apontando para ele), `/api/contato` (Route Handler de envio de e-mail).
- `(platform)` — sistema de ensino. `/entrar` (login institucional, fica fora dos dois grupos), `/dashboard`, `/missoes`, `/missoes/[id]`, `/diario`, `/professor`, `/professor/importar` (Import Wizard), `/professor/estudio` e `/professor/estudio/[id]` (Mission Studio), `/professor/aulas` e `/professor/aulas/[id]` (Lesson Composer), `/professor/curriculo` (Curriculum Engine), `/gestor` (Painel do Gestor, M15). A barreira de autenticação vive no middleware (`src/middleware.ts`): Workspace local simulado por padrão (M15) ou Auth.js quando as credenciais reais existem.
- Raiz compartilhada (`src/app/layout.tsx`) — só `<html>`, fontes, metadata base.

Domínio da aplicação vive em `src/modules/*`, um diretório por contexto, cada um com `domain/` (entidades + contratos, sem UI/banco) separado de `infrastructure/` (implementação atual — hoje local/simulada). Trocar a fonte de dados por um banco é trocar a injeção, nunca a UI.

Landing e Plataforma **compartilham um único Design System** (`src/styles/tokens.css`) — mesma paleta, tipografia, raios, sombras e biblioteca de componentes (`components/ui`). Nenhuma cor/fonte/raio novo é declarado fora desse arquivo.

Detalhe completo (regras de dependência, estratégia de crescimento): `PRODUCT.md`. Histórico de como se chegou aqui: `DECISIONS.md`.

## 4. Estrutura de pastas

```
IAH - Educacional/
├── app/                          ← aplicação Next.js (todo o código do produto)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx, globals.css, icon.svg, robots.ts, sitemap.ts
│       │   ├── entrar/page.tsx
│       │   ├── (marketing)/      ← Landing, /demonstracao, /contato, OG image
│       │   ├── (platform)/       ← dashboard, missoes, diario, professor
│       │   └── api/contato/      ← Route Handler (Resend, dormente)
│       ├── components/
│       │   ├── ui/               ← shadcn/ui, compartilhado pelos 2 blocos
│       │   ├── brand/logo.tsx    ← marca oficial, SVG num único arquivo
│       │   ├── layout/           ← sidebar, header, menu de acessibilidade (Plataforma)
│       │   └── marketing/        ← nav, rodapé, formulários (Landing)
│       ├── content/missions/     ← conteúdo pedagógico versionado em arquivo
│       ├── modules/
│       │   ├── library/          ← Mission (entidade + repositório local)
│       │   ├── classroom/        ← StudentWork + ClassMonitor (aluno/professor)
│       │   ├── integrations/     ← AuthProvider/ClassroomProvider/ImportProvider (mock + stubs)
│       │   ├── platform/         ← núcleo multi-tenant (entidades, contratos, seeds, factory)
│       │   ├── authoring/        ← Mission Studio (StudioMission, versionamento, IPE só contratos)
│       │   ├── knowledge/        ← Knowledge Engine (Biblioteca Inteligente — entidades, busca, integrações stub)
│       │   ├── lesson/           ← Lesson Composer (Lesson, regras de sugestão sem IA)
│       │   ├── curriculum/       ← Curriculum Engine (Unidades/Temas, timeline)
│       │   └── workspace/        ← Institutional Workspace (auth local simulada, papéis, contexto institucional)
│       ├── lib/                  ← site.ts (config/SEO), utils.ts
│       └── hooks/
│   └── db/migrations/            ← schema SQL versionado (sem INSERTs; ver PERSISTENCE.md)
├── docs/                         ← toda a documentação (este arquivo incluso)
├── assets/                       ← recursos de marca/mídia (reservado)
├── wordpress-theme/              ← tema WordPress temporário (domínio antigo)
└── CLAUDE.md                     ← regras gerais de desenvolvimento do projeto
```

## 5. Tecnologias utilizadas

- **Next.js 15.5** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (sobre **Base UI**, não Radix — atenção às peculiaridades de API, ex.: `render` em vez de `asChild`)
- **lucide-react** (ícones)
- **Resend** (SDK instalado, rota pronta, envio real ainda dormente)
- **@supabase/supabase-js** e **@supabase/ssr** (instalados; a arquitetura de persistência já os elege como stack — ver `PERSISTENCE.md` — mas **não há projeto Supabase/credenciais**; o client é criado só por `modules/platform/infrastructure/database/supabase-client.ts` e lança erro sem configuração)
- Hospedagem: **Vercel**; versionamento: **Git/GitHub**

## 6. Funcionalidades implementadas

- **Landing comercial completa**: Hero com desambiguação imediata ("não é AVA, não é chatbot, é sistema completo"), CTA logo após a Hero, seção de 6 pilares, "como funciona" (5 etapas), "implantação em 4 passos", bloco de confiança, CTA final — todos os CTAs apontando para `/demonstracao`.
- **`/demonstracao`**: formulário de 8 campos, confirmação inline profissional, e-mails institucionais, SEO própria, no sitemap.
- **Identidade visual oficial**: componente `Logo` (variantes clara/escura + wordmark), aplicado em sidebar, header/rodapé, `/entrar`, favicon, Open Graph.
- **`/entrar`**: abertura da Plataforma, sem autenticação real.
- **Dashboard**: Missão ativa real (não estático), progresso do dispositivo, estados iniciada/em andamento/concluída, skeleton de carregamento.
- **Missões** (`/missoes`, `/missoes/[id]`): Missão 01 completa com os 11 blocos + Dossiê de Auditoria (4 itens de investigação — 2 autênticos, 2 fabricados; chave de correção só em comentário de código, nunca exposta ao aluno), Guia de Investigação, Critérios de Auditoria.
- **Produção do Aluno**: autosave, entrega datada, reabertura.
- **Reflexão + Diário do Auditor** (`/diario`): liberada após a entrega da produção; unificada num único registro (`MissionWorkspace`) para não sobrescrever produção/reflexão.
- **Painel do Professor** (`/professor`): 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão por aluno (turma simulada); card "Integrações" (Google Workspace — não configurado).
- **Infraestrutura Google Workspace** (`modules/integrations`): contratos `AuthProvider`/`ClassroomProvider`, implementação simulada em uso, stub do provedor Google (sem chamada de rede). Ver `GOOGLE_WORKSPACE.md`.
- **Núcleo de persistência multi-tenant** (`modules/platform`, M04): 12 entidades com `institutionId`, contratos de repositório, seeds de demonstração em memória, stub de banco (Supabase/PostgreSQL), factory de troca, `ImportProvider` com 6 provedores; schema SQL em `app/db/migrations/`. Consumido pela seção Turmas do Painel do Professor (via seeds); demais telas seguem em localStorage/turma simulada. Ver `PERSISTENCE.md`.
- **Integração Google Classroom** (`modules/integrations/google-classroom`, M06): módulo plugável (real + mock), `ClassroomSyncService`/`ClassroomSyncState`, Import Wizard em `/professor/importar` (6 passos), seção Turmas no Painel do Professor, contratos de entrega de Missão. Sem OAuth/banco — dados simulados rotulados. Ver `GOOGLE_CLASSROOM_INTEGRATION.md`.
- **Autenticação definitiva** (M07): Auth.js v5 + Google, sessão JWT, middleware de rotas privadas, provisionamento automático do professor no primeiro login (`modules/identity`, migration `0003`), logout no header. **Ativa só quando o fundador executar os passos de console** (`AUTHENTICATION.md`/`SUPABASE.md`); sem credenciais, modo demonstração intacto.
- **Mission Studio** (M07, `/professor/estudio`, módulo `modules/authoring`): biblioteca com filtros/pesquisa, editor em 6 etapas com autosave, versionamento por linhagem (publicada imutável, nova versão para editar, nada apagado), publicação com pré-condições; **missões salvas neste dispositivo** (localStorage rotulado) até o banco existir; contratos do IPE prontos (sem IA). Ver `MISSION_STUDIO.md`.
- **Mission Flow** (M08, `/missoes/[id]`): a experiência do aluno virou 9 microetapas (Capa→Contexto→Objetivo→Investigação→Comparação→Produção→Critérios→Entrega→Reflexão), baixa carga cognitiva, 7 componentes reutilizáveis. Sem schema novo — um parser deriva estrutura do `didacticMaterials` existente. `modules/classroom` intocado. Ver `DECISIONS.md` D-027.
- **Knowledge Engine** (M11, módulo `modules/knowledge`): arquitetura da Biblioteca Inteligente — 6 entidades (`KnowledgeSource`/`Document`/`Collection`/`Tag`/`Topic`/`Reference`), 15 campos de metadados, 13 categorias de recurso, mecanismo de busca real (seed em memória), 7 contratos de integração futura (stub), schema versionado (`0004_knowledge_engine.sql`), vínculo direto com `Lesson`/Mission Flow via `KnowledgeReference`. Consumido pelo Lesson Composer (M12/M13) e pelo Curriculum Engine (M14). Ver `DECISIONS.md` D-034 e `KNOWLEDGE_ENGINE.md`.
- **Intelligent Lesson Composer** (M12/M13, `/professor/aulas`, módulo `modules/lesson`): assistente "Nova Lesson" em 7 etapas com sugestões automáticas por regra simples (sem IA), Lessons salvas no dispositivo (localStorage rotulado).
- **Curriculum Engine** (M14, `/professor/curriculo`, módulo `modules/curriculum`): navegação Disciplina → Ano Letivo → Unidades → Temas → Lessons → Mission Flow, com Timeline (concluídas/pendentes/competências).
- **Institutional Workspace** (M15, módulo `modules/workspace`): login institucional único (`/entrar`, e-mail + senha simulada `beryon2026`, exibida na tela), papel identificado automaticamente (admin/professor/aluno), contexto pedagógico automático em toda a navegação (Instituição, Ano Letivo, perfil, permissões, Turmas, Disciplinas), proteção de rotas por papel no middleware, sidebar por perfil, Painel do Gestor (`/gestor`) e hub de Workspace do Professor. Seed Colégio Beryon (5 turmas, 12 usuários). Troca por autenticação real (Google/Supabase/Microsoft Entra/Sophia) em dois pontos únicos: `WorkspaceAuthProvider` + `session-cookie.ts`.
- **Learning Lifecycle** (M17, `/professor/turmas`): conecta Institutional Workspace, Curriculum Engine, Lesson Composer, Knowledge Engine e Mission Flow. Professor seleciona Turma real → abre Lesson → publica a Mission (`MissionPublishingService`, `modules/platform`, contrato que era só "arquitetura" desde D-023). Aluno vê "Minha Lesson" no Dashboard. Professor acompanha (quantidade/iniciaram/concluíram/pendentes/percentual, entregas individuais) via `createInstitutionalClassMonitor`, que substitui `simulated-class-monitor` (removido de `modules/classroom`) implementando o mesmo contrato `ClassMonitorReader`. **Cuidado técnico achado na validação**: as factories seed de `platform`/`knowledge`/`curriculum` não memoizavam a instância — cada chamada criava um array novo e nenhuma escrita sobrevivia à leitura seguinte (Server Actions e Server Components do Next.js podem carregar o mesmo módulo em instâncias separadas); corrigido com singleton em `globalThis` (mesmo padrão do singleton do Prisma Client em Next.js) nas três factories.
- **Arquitetura Institucional Multi-Instituição** (M18, arquitetural — nenhuma UX/funcionalidade nova): `Institution` ganha `slug`/`domain` (e `logoUrl`/`colors`/`timezone` na extensão da mesma Sprint); domínio institucional padronizado para `@colegioberyon.com.br` em todo o seed (antes `@beryon.edu.br`), sempre derivado de `Institution.domain`, nunca retipado. `modules/workspace/seeds/beryon-seed.ts` → `institution-seed.ts`, `BERYON_*` → `WORKSPACE_*` — nenhum símbolo de código preso ao nome de uma escola específica. Login local de demonstração (`local-auth-provider.ts`) passa a validar que o e-mail pertence ao domínio institucional. Professor principal do piloto é o usuário real: **Fabio Ege**, `fabio.ege@colegioberyon.com.br`. Ver `DECISIONS.md` D-035.
- **Refinamento institucional + Sistema Oficial de Identidade Visual** (M18.1/M18.3): Painel do Gestor abre com o card "⭐ Instituição Fundadora do IAH®" (dados do contexto, nunca fixos). Marca institucionalizada com fonte única (D-036): `components/brand/logo.tsx` é o **master vetorial** (versões Primary/Reverse); `components/brand/symbol.tsx` é o símbolo oficial **Núcleo IAH** (geometria idêntica, transladada); cópias estáticas em `public/brand/`, favicon/apple-icon/manifest derivados do mesmo path; sidebar `collapsible="icon"` mostra só o símbolo quando recolhida. **Regra permanente**: o logotipo é ativo institucional protegido — nenhum agente de IA ou desenvolvedor pode redesenhá-lo; implementação e checklist de regeneração em `app/src/components/brand/BRAND_GUIDELINES.md`.
- **CI/CD completo**: push na `main` → deploy automático na Vercel.

Lista viva e mais detalhada: `STATUS.md` → "Funcionalidades prontas". Histórico entrega-a-entrega: `CHANGELOG.md`.

## 7. Funcionalidades pendentes

- **Ativação da autenticação e do banco** — o código está completo (M07); faltam os passos de console do fundador: projeto Google Cloud (OAuth), projeto Supabase (migrations 0001–0004 + linha da Instituição) e variáveis na Vercel — roteiros em `AUTHENTICATION.md`/`SUPABASE.md`. Até lá, a UI roda em `localStorage`/simulado.
- **Google Workspace real** (OAuth + Classroom API) — arquitetura pronta em `modules/integrations`, falta o projeto no Google Cloud Console (credenciais, verificação de escopos restritos); passo a passo em `GOOGLE_WORKSPACE.md`.
- **Biblioteca** — arquitetura pronta desde M11 (`modules/knowledge`, `KNOWLEDGE_ENGINE.md`), mas sem tela: o item da sidebar segue "Em breve" até existir uma página que consuma o módulo.
- **Projetos**, **Mentor IA**, **Agenda**, **Perfil**, **Laboratório** — itens da sidebar marcados "Em breve" e desabilitados (honestos, não clicáveis à toa).
- **Modo Claro funcional** — tokens existem, sem alternância na interface.
- **Efeitos do Menu de Acessibilidade** — interface pronta, nenhum efeito persiste ainda.
- **Envio real por Resend** — falta `RESEND_API_KEY`; formulários operam em `mailto:`.
- **Segunda Missão** — validar que "cadastrar arquivo de conteúdo" escala sem tocar em UI.
- **Virada de domínio** (`iaheducacional.com.br` → Next, saindo do WordPress temporário).

Backlog priorizado completo: `ROADMAP.md`.

## 8. Decisões técnicas relevantes

Resumo das mais importantes (histórico completo com motivo/alternativas/impacto em `DECISIONS.md`, entradas D-001 a D-018+):

- **Arquitetura modular por domínio** (D-001): `domain/` nunca conhece banco/UI.
- **Route groups** para Landing e Plataforma coexistirem num único projeto Next com servidor (D-007, D-008) — `output: export` foi tentado e abandonado por inviabilizar formulário com envio real e a própria Plataforma.
- **Design System unificado** (D-009): fonte única em `tokens.css`; a Plataforma adotou a marca IAH (cyan), abandonando um tema violeta anterior.
- **Premium Dark é a identidade principal**; Light Mode é suporte planejado, não ativo (D-010).
- **MVP de sala de aula/demonstração precede escala comercial** (D-011, D-014) — pivô de um roadmap temático original para entregas ordenadas pela jornada mínima de uma aula.
- **Dados simulados são um padrão de transição explícito e rotulado** (D-015) — nunca dado fictício silencioso.
- **Itens de navegação não construídos são explicitamente "Em breve"**, nunca um link morto silencioso (D-016).
- **Skeleton de carregamento** em qualquer tela que dependa de leitura client-side antes de existir banco (D-017).
- **Consolidação de documentação** em 5 arquivos oficiais, substituindo um conjunto fragmentado e por vezes desatualizado (D-018).
- **Módulo `integrations` com abstração de provedor, sem dependência externa** (D-019): contratos `AuthProvider`/`ClassroomProvider`, implementação simulada em uso, stub do Google sem chamada de rede — escopo reduzido deliberadamente após análise de risco (verificação de escopos restritos do Google, tela de "app não verificado") antes da demonstração de agosto.
- **Modelo institucional consolidado em `DOMAIN_MODEL.md`, com `Ano Letivo` como entidade** (D-020): um modelo mais completo já existia fragmentado (`06_DOMAIN_MODEL.md`); consolidado em vez de duplicado, para não repetir o problema que D-018 corrigiu. Nomes de entidade em português (convenção do domínio de produto), com tabela de equivalência para os identificadores em inglês que o código usará.
- **`ClassroomIntegration`/`IntegrationProvider`/`Indicadores` + `IMPORT_ARCHITECTURE.md`** (D-021): camada de importação formal (contrato `ImportProvider`, 5 provedores futuros previstos), documento dedicado por volume próprio de conteúdo. `MASTER.md` não foi criado — não existe no projeto e `HANDOFF.md` já cumpre esse papel.
- **Motor de autoria: `Mission` decomposto em 10 entidades versionáveis** (D-022, `AUTHORING_MODEL.md`): achado concreto ao inspecionar a Missão 01 — Evidence/EvaluationCriteria hoje são strings soltas em `didacticMaterials`, chave de correção só em comentário de código. Decomposição é aditiva — a Missão 02 não precisa esperar por ela.
- **Núcleo de persistência: Supabase/PostgreSQL sem Prisma, banco como stub até haver credenciais** (D-023, `PERSISTENCE.md`): multi-tenant por `institution_id` (contrato + query + futura RLS, nunca bancos separados); seeds de demonstração jamais persistidos (banco real nasce vazio); troca seed→banco acontece só na `repository-factory`.
- **Google Classroom plugável, Import Wizard sem OAuth/banco** (D-024, `GOOGLE_CLASSROOM_INTEGRATION.md`): mappers isolam os tipos Google do resto; `ClassroomSyncService` compõe o `ImportService` (não duplica) e é genérico; Wizard e Turmas sobre dados simulados rotulados; entrega de Missão é só contrato. Não se fabricou seed com o nome do Colégio Beryon (instituição real) — a prontidão real depende de OAuth+banco.
- **Autenticação: Auth.js v5 + Google, sessão JWT, allowlist fechada por padrão** (D-025, `AUTHENTICATION.md`): sem `AUTH_ALLOWED_EMAILS` ninguém entra; Instituição nunca criada automaticamente (inserida pelo responsável — `SUPABASE.md`); sem tabela de sessões (JWT); toda autenticação passa pelo contrato `AuthProvider` via `getAuthProvider()`. Cuidado técnico: o gate `isAuthConfigured()` no middleware fica ANTES de invocar o Auth.js (sem `AUTH_SECRET`, o Auth.js lança `MissingSecret` antes do callback `authorized`).
- **Mission Studio: autoria localStorage rotulada, publicada imutável, IPE só contratos** (D-026, `MISSION_STUDIO.md`): versionamento por linhagem, "Publicar" declara alcance real (Estúdio, não runtime do aluno), nenhum botão de IA sem IA por trás.
- **Mission Flow: parser de conteúdo em vez de schema novo, imagem via ícone não foto** (D-027, `DECISIONS.md`): `didacticMaterials` decomposto por prefixo já usado na escrita; retomada inteligente deriva a etapa do `StudentWork` já existente, sem novo storage; nenhuma foto fabricada da manchete (colidiria com o critério de coerência de imagem da própria Missão).
- **Lesson como unidade pedagógica central; Missão vira um recurso dentro dela** (D-028, `DECISIONS.md`): sprint só de documentação, nenhum código. `Lesson` (Aula) é o Pedagogical Package que o Professor usa para conduzir uma aula — agrupa Planejamento, Objetivos, Competências BNCC, Série, Tempo, Pré-requisitos, Mission Flow (referenciado, não substituído), Slides, Material NotebookLM, Biblioteca Oficial, Estudos de Caso, Exercícios, Rubricas, Avaliação Assistida, Adaptações para Neurodivergentes, Portfólio e Analytics. Seis contratos nomeados em prosa (`Lesson`/`LessonBuilder`/`LessonResources`/`LessonMaterial`/`LessonAssessment`/`LessonAccessibility`), sem arquivo `.ts` ainda. `DOMAIN_MODEL.md` não foi tocado (fora do escopo desta Sprint) e continua descrevendo `Missão` como hoje — sem contradição, ver a "Nota de coerência" em D-028. `LessonAccessibility` tem um ponto em aberto sensível (dado de saúde de menor, LGPD) que exige revisão pedagógica/jurídica antes de qualquer implementação.
- **Alinhamento Normativo: LDB/BNCC/BNCC Computação/Método IAH® como referenciais permanentes** (D-029 a D-033, `DECISIONS.md`): metadados curriculares obrigatórios em `Lesson`/`Mission`, rastreabilidade de competência em toda avaliação (`LessonAssessment`), visualização do alinhamento curricular antes de publicar, relatórios pedagógicos por competência (extensão de `Indicadores`/Painel do Gestor). Só documentação — nenhum campo, validação ou tela implementada.
- **Knowledge Engine: módulo `modules/knowledge`, seed em memória + banco stub** (D-034, `KNOWLEDGE_ENGINE.md`): 6 entidades materializam a `Biblioteca` de `DOMAIN_MODEL.md`; `KnowledgeReference` é o vínculo direto com `Lesson`/Mission Flow; `search()` cobre as 6 pesquisas pedidas com filtragem real na implementação seed; 7 integrações futuras só como contrato (mesmo padrão D-019); reaproveita `isDatabaseConfigured` de `modules/platform` em vez de um segundo cliente Supabase. Schema em `0004_knowledge_engine.sql`, sem INSERT. Nenhuma página consome o módulo.
- **Base UI (não Radix)** por baixo do shadcn/ui: `render` no lugar de `asChild`; `DropdownMenuLabel` exige estar dentro de `Group`/`RadioGroup`.

## 9. Convenções adotadas

- **Português na interface e no domínio de produto** (nomes de conceito: Missão, Diário do Auditor, Auditor da Realidade); **inglês no código** (identificadores, nomes de tipos/funções).
- **Uma Missão = um arquivo de conteúdo** em `src/content/missions/`, registrado no índice — nenhuma tela muda ao adicionar uma nova.
- **Toda fonte simulada/local implementa o mesmo contrato** que a futura fonte real (`MissionReader`, `ClassMonitorReader`) — a troca é uma injeção, nunca a UI.
- **Nenhuma cor/fonte/raio/sombra nova fora de `tokens.css`.**
- **Links de navegação usam `<Link>` real com `buttonVariants`**, nunca o componente `Button` do shadcn com `render` para navegação (gera aviso de acessibilidade no Base UI).
- **Dados simulados/fictícios são sempre identificados como tal** na interface (ex.: "Turma de demonstração"), nunca apresentados como reais.
- **Commits descritivos em português**, prefixo de tipo (`feat`, `fix`, `docs`) + escopo.
- Regras gerais herdadas de `CLAUDE.md`: nunca criar funcionalidade não solicitada, sempre explicar o plano antes de implementar, simplicidade sobre completude prematura.
- **Alinhamento Normativo (referenciais permanentes):** toda funcionalidade pedagógica futura deve considerar conformidade com a LDB, alinhamento à BNCC, alinhamento à BNCC Computação e integração ao Método IAH® (metodologia proprietária que complementa e operacionaliza esses referenciais, não os substitui) — ver `STATUS.md` "Alinhamento Normativo" e `DECISIONS.md` D-029 a D-033.

## 10. Fluxo de deploy

**Desenvolvimento → Git → GitHub → Vercel → Validação → Produção.**

- Repositório: `github.com/profabioege/iah-platform` (privado).
- Vercel conectada ao GitHub; **Root Directory: `app`** (crítico — o projeto Next vive na subpasta).
- Push na `main` → build e deploy automático em **https://iah-platform.vercel.app** (ambiente oficial de homologação).
- Domínio definitivo `iaheducacional.com.br` **ainda serve o WordPress temporário** — virada de DNS pendente, checklist completo em `DEPLOY.md`.
- Toda entrega é validada no navegador real na Vercel antes de ser considerada concluída (não só build local).
- **Cuidado de dev:** rodar `next build` com `next dev` ativo corrompe o cache `.next` (erro 500). Parar o dev server antes do build, ou limpar `.next` e reiniciar.

## 11. Variáveis de ambiente

Nenhuma é obrigatória para o site subir — cada ausência apenas desliga a funcionalidade correspondente (ver `app/.env.example`):

| Variável | Para quê | Sem ela |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URLs canônicas, sitemap, OG | autodetecta a URL da Vercel |
| `RESEND_API_KEY` | Envio real dos formulários (`/api/contato`) | formulários seguem em `mailto:` |
| `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | Destino/remetente via Resend | usa `contato@iaheducacional.com.br` / remetente de teste |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Botão de WhatsApp (componente pronto, não usado no fluxo atual) | botão não aparece |

Já usadas pela autenticação/persistência quando definidas (M07 — ver `AUTHENTICATION.md`/`SUPABASE.md` e `app/.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_ALLOWED_EMAILS`, `AUTH_DEFAULT_INSTITUTION_SLUG`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Reservadas para o futuro, ainda não usadas: `OPENAI_API_KEY`, credenciais de Canva.

Segredos existem **só** em `app/.env.local` (gitignored) e no painel da Vercel — nunca em código ou commit.

## 12. Próximos milestones

1. **Reensaiar o tempo da demonstração** — a interface da Missão mudou de novo (Mission Flow, M08, 9 microetapas); `ROTEIRO-DEMONSTRACAO.md` e a meta de 15 min descrevem o fluxo antigo. Prioridade máxima antes de qualquer outra coisa. Decidir também a divergência "15 ou 20 minutos" (Landing vs. meta interna) — ver `STATUS.md`.
2. **Painel do Gestor (MVP Comercial)** — próxima Sprint planejada (não implementada ainda); ver `ROADMAP.md`, "Sprint seguinte", para o planejamento técnico e funcional completo, aguardando aprovação para implementar.
3. Corrigir a observação de SEO pendente (título sem sufixo em subpáginas do bloco `(marketing)`).
4. **Ativar autenticação + Google Workspace real** — passos de console do fundador (`AUTHENTICATION.md`/`SUPABASE.md`/`GOOGLE_WORKSPACE.md`); depois disso, implementar `google-classroom-repository` (hoje stub) para sincronizar turmas reais.
5. Pós-piloto (sem data, ordem no `ROADMAP.md`): Biblioteca → Persistência em banco → Segunda Missão → privacidade do Diário → Mentor IA → Modo Claro → virada de domínio.

## 13. Principais riscos

- **Dados do aluno só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados.
- **Sem autenticação**: qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.
- **Formulários em `mailto:`**: dependem do cliente de e-mail do visitante estar configurado no dispositivo; sem confirmação de entrega real até o Resend ser ativado.
- **Janela de contexto**: este documento existe justamente porque o histórico de decisões é grande — qualquer nova sessão deve ler `STATUS.md` + este HANDOFF antes de propor mudanças, para não repetir decisões já tomadas e descartadas (ver `DECISIONS.md`).

## 14. Checklist para continuidade

Antes de implementar qualquer coisa numa nova sessão:

- [ ] Ler `STATUS.md` (estado exato, último commit/deploy, próxima tarefa recomendada).
- [ ] Ler este `HANDOFF.md` inteiro.
- [ ] Consultar `VISION.md` antes de aceitar/rejeitar qualquer nova funcionalidade proposta.
- [ ] Consultar `PRODUCT.md` para arquitetura, Design System e convenções antes de tocar em código.
- [ ] Consultar `DOMAIN_MODEL.md` antes de modelar qualquer entidade institucional nova (Instituição, Turma, Aluno, Professor, Ano Letivo etc.) — evita reinventar um modelo que já existe conceitualmente. Para integrações/importação de dados externos, consultar também `IMPORT_ARCHITECTURE.md`; para autoria/estrutura de Missões, consultar `AUTHORING_MODEL.md`.
- [ ] Consultar `ROADMAP.md` para a próxima prioridade real (não reinventar sequenciamento).
- [ ] Verificar `DECISIONS.md` antes de propor algo que pareça "óbvio" — pode já ter sido tentado e descartado (ex.: `output: export`, tema violeta).
- [ ] Depois de qualquer entrega: rodar `npx tsc --noEmit`, `npm run lint`, `npm run build` (com o dev server **parado**).
- [ ] Validar no navegador (local e, após deploy, na Vercel) — nunca considerar concluído só com build verde.
- [ ] Commit descritivo → push → aguardar deploy automático → validar na URL de produção.
- [ ] Atualizar `STATUS.md` e `CHANGELOG.md` ao final da tarefa — sempre, sem exceção.
