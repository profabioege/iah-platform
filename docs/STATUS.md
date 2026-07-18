# Status — IAH Educacional

Fotografia do estado atual do projeto. **Este é o primeiro documento a consultar antes de qualquer nova implementação.** Atualizado ao final de cada tarefa — se este arquivo diverge do código, o código manda, mas a divergência deve ser corrigida aqui imediatamente. Histórico entrega-a-entrega em `CHANGELOG.md`. **Retomando o projeto numa nova conversa (janela de contexto reiniciada): leia `HANDOFF.md` primeiro** — é o resumo único de todo o histórico, escrito para esse exato momento.

## Estado atual

Projeto em **fase de preparação do piloto comercial de agosto/2026**, com um funil comercial completo: Landing (pitch) → `/demonstracao` (conversão) → confirmação. A Plataforma executa uma jornada completa de aula (aluno) e um painel de acompanhamento (professor) para a Missão 01, com o Dossiê de Auditoria completo. Nenhuma autenticação real, nenhum banco de dados — persistência do aluno em localStorage; turma do professor é simulada (autorizada, rotulada como "Turma de demonstração").

## Último commit

`16312b4` (anterior a esta tarefa) — *feat(auth): M07 — Primeiro Usuário Real* (16/07/2026), branch `main`. Este ciclo (Ciclo 2) segue com o Mission Studio — ver "Ciclo 2 — Mission Studio" abaixo. Ver `CHANGELOG.md` para o histórico completo.

## Ciclo 2 — Mission Studio (16/07/2026)

Estúdio de Missões em `/professor/estudio`: Biblioteca (filtros por ano/disciplina/competência/autor/status + pesquisa, Nova Missão, duplicar) e editor em 6 etapas (Identificação → Pedagogia → Investigação → Avaliação → Materiais → Visualizar & Publicar) com autosave, versionamento por linhagem (publicada é imutável; editar exige nova versão; nada é apagado — só arquivada) e publicação com pré-condições verificáveis. Novo módulo `modules/authoring` (materializa o `MissionTemplate` de `AUTHORING_MODEL.md` + metadados novos da Sprint). **Persistência: neste dispositivo (localStorage), rotulada** — banco entra pelo ponto único `getMissionStudioRepository()` com o Supabase (checklist `PERSISTENCE.md`). "Publicar" declara o alcance real (Biblioteca do Estúdio; runtime do aluno é etapa futura). IPE: só contratos (`IpePedagogicalEngine`), nenhuma IA, nenhum botão fake. Correção de bug real achada na validação: gate `isAuthConfigured()` movido para antes do Auth.js no middleware (lançava `MissingSecret` sem `AUTH_SECRET`). Ver `DECISIONS.md` D-026 e `MISSION_STUDIO.md`.

## Ciclo 2 — Primeiro Usuário Real / Autenticação (16/07/2026)

Infraestrutura definitiva de login implementada — **aguardando apenas os passos de console do fundador** (criar projeto Google Cloud + projeto Supabase e definir as variáveis; roteiros prontos em `AUTHENTICATION.md` e `SUPABASE.md`). Auth.js v5 com Google exclusivo (única dependência nova); sessão JWT persistente; middleware protegendo `/dashboard`, `/missoes`, `/diario`, `/professor` quando configurado; logout no header. Primeiro login provisiona automaticamente Usuário → Professor → Perfil → Instituição (migration `0003_identity.sql`; queries Supabase reais em `modules/identity`). Allowlist fechada por padrão (`AUTH_ALLOWED_EMAILS`); a Instituição é inserida pelo responsável real, nunca criada automaticamente. Sem credenciais, o modo demonstração segue **idêntico** (validado: /entrar, /dashboard e /professor inalterados, console limpo, bundles de página iguais). O fluxo autenticado real será validado no primeiro login do fundador. Ver `DECISIONS.md` D-025.

## Ciclo 2 — Google Classroom + Import Wizard (16/07/2026)

Camada de integração com o Google Classroom, plugável, **sem OAuth e sem banco** ainda. Novo módulo `modules/integrations/google-classroom` (types/dto/contracts/mappers/repositories/services/mock) que adapta o Google ao contrato genérico `ImportProvider` — nada fora dele conhece tipos Google. `ClassroomService` real pronto (camada de dados `repositories/` é stub até haver credenciais); `mockClassroomService` fornece dados simulados rotulados. `ClassroomSyncService` (genérico, em `modules/platform`) compõe o `ImportService` e registra `ClassroomSyncState` (nova entidade + migration `0002`). **Import Wizard** em `/professor/importar` (6 passos: Instituição → Conectar Google → Turmas → Alunos → Confirmação → Resumo) sobre dados simulados, com aviso explícito e Resumo declarando que nada foi gravado. Painel do Professor ganhou seção **Turmas** (nome, ano, nº de alunos, status de sincronização, última atualização, botão Visualizar), lendo do módulo `platform`. Contratos de entrega de Missão (`mission-delivery.ts`) criados como arquitetura, sem implementação. Sobre o piloto Beryon: entregue a infraestrutura, não seeds com o nome da escola real (ver `GOOGLE_CLASSROOM_INTEGRATION.md`, D-024). Validado: typecheck/lint/build limpos, wizard percorrido nos 6 passos, sem overflow mobile, console limpo.

## Ciclo 2 — Núcleo da Plataforma (16/07/2026)

Sprint de arquitetura, zero mudança visual (bundles idênticos — nenhuma página importa o módulo novo). Novo módulo `modules/platform`: 12 entidades multi-tenant (toda operacional com `institutionId`), contratos de repositório que exigem `institutionId` em todo método, `SeedRepositories` funcionais em memória, `DatabaseRepositories` como stub (padrão D-019 — sem credenciais, sem query especulativa), factory como único ponto de troca. Stack decidida: **Supabase/PostgreSQL, sem Prisma** (`PERSISTENCE.md`). Schema versionado em `app/db/migrations/0001_initial_schema.sql` (11 tabelas, sem nenhum INSERT — banco real nasce vazio). Seeds de demonstração desacoplados em `modules/platform/seeds/` (nunca persistidos). `ImportProvider` implementado em `modules/integrations/import` (manual funcional + 5 stubs), com `ImportService` responsável pela gravação após revisão humana. A UI continua 100% nos stores atuais (localStorage + turma simulada) — a troca futura segue o checklist de 7 passos em `PERSISTENCE.md`. Ver `DECISIONS.md` D-023.

## Ciclo 2 — Sistema de Autoria (16/07/2026)

Sprint só de documentação — nenhum código, UI, página, rota ou banco de dados alterado. Novo `docs/AUTHORING_MODEL.md`: decompõe o `Mission` plano de hoje em 10 entidades (`MissionTemplate`, `MissionSection`, `Evidence`, `Challenge`, `EvaluationCriteria`, `ReflectionGuide`, `TeacherGuide`, `Competency`, `LearningObjective`, `DidacticMaterial`), com fluxo de criação (nasce → evolui → publica) e estratégia de versionamento (unidade de versão = `MissionTemplate` inteiro). Achado concreto ao inspecionar o conteúdo real da Missão 01: os itens do Dossiê de Auditoria e o Guia de Investigação hoje são strings soltas em `didacticMaterials`, e a chave de correção existe só como comentário de código, nunca como dado — exatamente a lacuna que a decomposição resolve. Ver `DECISIONS.md` D-022.

## Ciclo 2 — Fundação da Plataforma (16/07/2026)

Sprint só de documentação — nenhum código, UI, página, rota ou banco de dados alterado. `DOMAIN_MODEL.md` ganhou três entidades: `ClassroomIntegration` (especialização de Integração), `IntegrationProvider` (contrato-guarda-chuva de `AuthProvider`/`ClassroomProvider`/`ImportProvider`) e `Indicadores` (projeção agregada, base do futuro Painel do Gestor). Novo `docs/IMPORT_ARCHITECTURE.md`: contrato `ImportProvider`, as 5 implementações futuras previstas (Manual, CSV, Google Classroom, Microsoft Teams, Moodle), fluxo de revisão humana obrigatória antes de qualquer gravação, reconciliação de identidade por e-mail. Pedido de um `MASTER.md` foi resolvido apontando para `HANDOFF.md` (já cumpre esse papel desde D-018) em vez de criar um documento paralelo — ver `DECISIONS.md` D-021.

## Ciclo 2 — Modelo Institucional (16/07/2026)

Sprint só de documentação — nenhum código, UI, página ou rota alterado. `docs/DOMAIN_MODEL.md` consolidado como modelo conceitual institucional único (Identidade & Acesso, Instituição, Currículo & Autoria, Aprendizagem & Entrega, Integrações, Colaboração, Acervo, Operação), substituindo o conteúdo que vivia em `06_DOMAIN_MODEL.md` (agora redirecionamento). Nova entidade `Ano Letivo`. Novo fluxo institucional documentado (Instituição → Professor → Turma → Aluno → Missão) e nova análise de origens de dados futuras (cadastro manual, CSV, Google Classroom, Microsoft Teams — todas convergindo para o mesmo modelo interno via `ClassroomProvider`). Ver `DECISIONS.md` D-020 para o porquê da consolidação em vez de um documento novo.

## Ciclo 2 — Infraestrutura Google Workspace (16/07/2026)

Sprint M03: escopo original (login Google real + Google Classroom real) foi reduzido, após análise de risco, para arquitetura pura — nenhuma credencial, pacote ou chamada externa (ver `DECISIONS.md`, D-019). Entregue: novo módulo `modules/integrations` com contratos `AuthProvider` e `ClassroomProvider`, cada um com implementação simulada (usada hoje) e stub do provedor Google (lança erro se chamado, nenhuma chamada de rede existe); card "Integrações" no Painel do Professor (`○ Google Workspace — Não configurado`); `docs/GOOGLE_WORKSPACE.md` com credenciais, APIs/escopos e passos futuros no Google Cloud Console. `/entrar` e o fluxo de demonstração de agosto não foram tocados. Validado em desktop/tablet/mobile, sem overflow, console limpo.

## Ciclo 2 — Ensaio da demonstração (16/07/2026)

Sprint de validação (sem código novo): percorrido o fluxo completo na Vercel de produção (Landing → `/demonstracao` → Entrar → Dashboard → Missão 01 → Dossiê de Auditoria completo → manchete gerada → Reflexão → Diário → Painel do Professor), sem erro de console em nenhuma etapa. Responsividade confirmada em 5 larguras (desktop, notebook 1366×768, projetor 1024×768, tablet, mobile) — nenhuma quebra visual encontrada, nenhuma correção necessária. Roteiro de apresentação por etapa, com tempo estimado por volume de conteúdo (~13–14 min), redigido em `ROTEIRO-DEMONSTRACAO.md`.

**Limite do ensaio:** a estimativa de tempo é calibrada por conteúdo, não por uma leitura humana cronometrada — falta esse ensaio real (roteiro em voz alta, cronômetro em mão) antes de considerar a meta de 15 minutos confirmada.

**Achado a decidir:** a Landing promete "uma demonstração de 20 minutos" no CTA final ([app/src/app/(marketing)/page.tsx:446](../app/src/app/(marketing)/page.tsx)), divergente da meta interna de 15 minutos em `ROADMAP.md`. Não corrigido nesta Sprint — é decisão de produto, não uma quebra visual.

## Último deploy

**https://iah-platform.vercel.app** — ambiente oficial de homologação. Deploy automático a cada push na `main` (Vercel conectada ao GitHub `profabioege/iah-platform`, privado). Validado manualmente no navegador nesta Sprint: fluxo Landing → `/demonstracao` (formulário → confirmação) → Entrar → Dashboard → Missão → Dossiê completo → Produção → Reflexão → Diário → Painel do Professor, em 5 larguras, sem erros de console.

Domínio definitivo `iaheducacional.com.br` **ainda serve o WordPress temporário** — virada de DNS pendente (checklist em `DEPLOY.md`).

## Funcionalidades prontas

- Landing institucional completa (`/`), estruturada como pitch comercial: Hero com desambiguação imediata ("não é AVA, não é chatbot, é sistema completo"), CTA logo após a Hero, seção "Tudo o que a escola precisa para ensinar IA" (6 pilares), "Como o IAH funciona na prática" (fluxo de 5 etapas), "Implantação em 4 passos", bloco de confiança (metodologia nascida em sala real) e CTA final. Todos os CTAs "Solicitar demonstração" (Hero, faixa pós-Hero, nav, rodapé, CTA final) apontam para `/demonstracao`.
- `/demonstracao`: funil comercial principal — Hero própria ("Tecnologia sozinha não ensina IA. Metodologia sim."), formulário de 8 campos (Nome, Escola, Cargo, Cidade/Estado, Nº de alunos, E-mail institucional, Telefone, Mensagem), confirmação inline ("Recebemos sua solicitação. Entraremos em contato em até 1 dia útil."), e-mails institucionais, SEO própria (title/description/canonical/OG) e entrada no sitemap. Envio em modo `mailto:`; `/api/contato` já aceita todos os campos para a futura troca por Resend. `/contato` (formulário mais simples, 5 campos) permanece no ar mas não é mais linkado de lugar nenhum — sucedido por `/demonstracao`.
- Abertura da Plataforma (`/entrar`, sem autenticação real).
- Dashboard (`/dashboard`) com Missão ativa real e progresso do dispositivo.
- Lista e detalhe de Missão (`/missoes`, `/missoes/[id]`) — Missão 01 "A Fábrica de Notícias" com os 11 blocos e o **Dossiê de Auditoria completo**: 4 manchetes reais de investigação (2 autênticas, 2 fabricadas — chave de correção só no código-fonte, nunca exibida ao aluno), Guia de Investigação (5 critérios: fonte, data/escopo, evidência, linguagem, coerência interna) e Critérios de Auditoria explícitos.
- Produção do Aluno (autosave, entrega, reabertura).
- Reflexão + Diário do Auditor (`/diario`), liberada após a entrega da produção.
- Painel do Professor (`/professor`) com turma simulada (11 alunos), 8 estados, filtro por status, abertura de produção/reflexão.
- Identidade visual oficial (logo, favicon, Open Graph) aplicada em toda a superfície.
- CI/CD completo (Git → GitHub → Vercel).
- Fluxo de demonstração revisado ponta a ponta: continuidade Landing → Entrar → Dashboard → Missão → Produção → Reflexão → Diário → Painel do Professor sem telas brancas (skeletons em `MissionWorkspace` e `DiarioList`), header com título de seção consistente em todas as rotas, e Landing com copy comercial focada em benefício para gestores.
- Infraestrutura de integração Google Workspace (`modules/integrations`): contratos `AuthProvider`/`ClassroomProvider` com implementação simulada; card "Integrações" no Painel do Professor. Nenhuma credencial real, nenhuma chamada externa — ver `GOOGLE_WORKSPACE.md`.
- Núcleo de persistência multi-tenant (`modules/platform`): entidades, contratos, seeds de demonstração, stub de banco e factory — pronto para a troca futura sem alterar UI; schema SQL versionado em `app/db/migrations/`. Ver `PERSISTENCE.md`.
- Integração Google Classroom (`modules/integrations/google-classroom`): módulo plugável (real + mock), `ClassroomSyncService`, Import Wizard (`/professor/importar`) e seção Turmas no Painel do Professor — tudo sobre dados simulados rotulados, sem OAuth/banco. Ver `GOOGLE_CLASSROOM_INTEGRATION.md`.
- Autenticação (Auth.js v5 + Google): login/logout, sessão JWT, middleware de rotas privadas, provisionamento automático do professor no primeiro login (`modules/identity`, migration `0003`) — ativa ao definir as credenciais; sem elas, modo demonstração intacto. Ver `AUTHENTICATION.md`/`SUPABASE.md`.
- Mission Studio (`/professor/estudio`, módulo `modules/authoring`): biblioteca com filtros/pesquisa, editor em 6 etapas com autosave, versionamento por linhagem (publicada imutável), publicação com pré-condições; missões salvas neste dispositivo (localStorage rotulado); contratos do IPE prontos, sem IA. Ver `MISSION_STUDIO.md`.

## Funcionalidades em andamento / lacunas conhecidas

- Sidebar tem 6 itens intencionalmente desabilitados ("Em breve"): Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil.
- Menu de Acessibilidade tem interface completa mas nenhum efeito persiste ainda.
- Modo Claro existe como tokens, sem alternância funcional na interface.
- Formulário de demonstração da Landing está em modo `mailto:` (Resend pronto, dormente — falta `RESEND_API_KEY`).

## Próxima tarefa

**Do fundador (fora do código, ~15 min):** executar os passos de console de `AUTHENTICATION.md`/`SUPABASE.md` — criar projeto Google Cloud (OAuth) e projeto Supabase (migrations 0001–0003 + linha da Instituição), definir as variáveis na Vercel e fazer o primeiro login real. **Da próxima Sprint (código):** com o login validado, implementar o `google-classroom-repository` (hoje stub) para sincronizar as turmas reais — o restante do caminho já está pronto (`GOOGLE_CLASSROOM_INTEGRATION.md`). Em paralelo seguem pendentes: Painel do Gestor (planejado no `ROADMAP.md`), meta da demonstração (15 ou 20 min) e ensaio humano cronometrado (`ROTEIRO-DEMONSTRACAO.md`).

## Riscos conhecidos

- **Meta de tempo da demonstração ainda não validada por um ensaio humano:** a validação técnica confirmou que o fluxo funciona sem erro e sem quebra visual em 5 larguras, mas não mede tempo de fala humana — a meta de 15 (ou 20?) minutos segue não confirmada na prática.
- **Dados do aluno vivem só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real sem banco.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados, não a turma real do professor.
- **Sem autenticação:** qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.
- **Google Workspace segue sem credenciais reais:** a arquitetura está pronta (`modules/integrations`), mas login e Classroom reais dependem de um projeto no Google Cloud Console que ainda não existe — ver `GOOGLE_WORKSPACE.md`.

## Pendências

- **Divergência de meta de tempo:** Landing promete "20 minutos" ([app/src/app/(marketing)/page.tsx:446](../app/src/app/(marketing)/page.tsx)), `ROADMAP.md`/`STATUS.md` registram meta de 15 minutos — decidir qual é a real e ajustar o outro lado.
- Definir `RESEND_API_KEY` (e domínio verificado no Resend) para os formulários de demonstração/contato saírem do modo `mailto:`.
- Acesso ao DNS de `iaheducacional.com.br` para a futura virada do domínio (ver `DEPLOY.md`).
- Proteção da branch `main` no GitHub (exigir Pull Request) — recomendado, não implementado.
- Criar projeto no Google Cloud Console (credenciais OAuth) quando o piloto institucional exigir login/Classroom reais — passo a passo em `GOOGLE_WORKSPACE.md`.
- **Observação de SEO (não corrigida, fora de escopo desta Sprint):** páginas do bloco `(marketing)` além da home (`/demonstracao`, `/contato`) renderizam `<title>` sem o sufixo "| IAH Educacional", porque o layout do bloco define `title: { absolute: ... }` sem `template`, quebrando a herança do template do layout raiz. Padrão pré-existente (já valia para `/contato` antes desta Sprint), não introduzido agora — mas vale corrigir numa futura passada de SEO.
