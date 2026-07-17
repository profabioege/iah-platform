# Decisões Arquiteturais — IAH Educacional

Histórico cronológico de toda decisão arquitetural relevante, conforme exigido por `CLAUDE.md`. Fonte oficial única — substitui `07_DECISIONS.md` e `ARCHITECTURE.md` (mantidos como redirecionamento). Formato de cada entrada: **decisão · motivo · alternativas descartadas · impacto futuro**.

## D-001 — Arquitetura modular por domínio (13/07/2026)

**Decisão:** Código de domínio organizado em `app/src/modules/`, um diretório por contexto, com camada `domain/` (entidades + contratos) separada de `infrastructure/` (implementação). Domínio não conhece banco, framework ou UI.

**Motivo:** Início do módulo Biblioteca (Missões). Precisava de um padrão replicável antes de o segundo módulo existir.

**Alternativas descartadas:** Colocar tipos direto nos componentes de página (mais rápido, mas acopla domínio a UI e impede trocar a fonte de dados sem tocar em interface).

**Impacto futuro:** Todo módulo novo (`classroom` foi o segundo) segue este padrão. Banco de dados pode ser adicionado depois sem retrabalho no domínio.

## D-002 — App Shell da Plataforma (13/07/2026)

**Decisão:** `SidebarProvider` + sidebar + header como layout da Plataforma, tema Premium Dark como padrão. Menus iniciais estáticos (sem rota real ainda).

**Motivo:** Sprint 1 pedia só estrutura visual, sem funcionalidades.

**Alternativas descartadas:** Nenhuma — primeira decisão de shell, sem alternativa concorrente avaliada.

**Impacto futuro:** Estabeleceu a identidade "laboratório de IA", referência para todo desenho posterior. Os menus decorativos foram substituídos por navegação real ao longo das Sprints seguintes (D-007 em diante).

## D-003 — Menu de Acessibilidade (14/07/2026)

**Decisão:** Componente `AccessibilityMenu`, ícone `Accessibility` (Lucide) em vez do símbolo ♿. Três seções (Aparência, Leitura, Acessibilidade) com pontos de conexão (`updatePreference`, `adjustFontSize`) já definidos para quando os efeitos forem implementados.

**Motivo:** Símbolo ♿ associa-se só a deficiência física; o produto quer representar inclusão ampla (leitura, foco, cognição).

**Alternativas descartadas:** Ícone ♿ tradicional (rejeitado por estreiteza semântica).

**Impacto futuro:** Interface pronta; efeitos e persistência ainda não implementados (pendência aberta em `STATUS.md`).

## D-004 — Landing sozinha na raiz *(superada por D-007)*

**Decisão, na época:** Rota raiz passou a renderizar só a Landing, sem os componentes de App Shell da Plataforma.

**Motivo:** A aplicação ganhou uma página institucional para apresentação comercial.

**Por que foi superada:** Deixou a Plataforma órfã — sem nenhuma rota que a servisse.

## D-005 — Exportação estática para WordPress *(superada por D-008)*

**Decisão, na época:** `output: "export"` no Next.js, gerando HTML/CSS/JS estático para a hospedagem WordPress contratada.

**Motivo:** Domínio já tinha hospedagem WordPress; a Landing, no momento, não usava recursos de servidor.

**Por que foi superada:** Export estático é incompatível com formulário de conversão com envio real de e-mail e com a própria Plataforma (autenticação, banco, IA).

## D-006 — Tema WordPress como artefato temporário (14/07/2026)

**Decisão:** Criado `wordpress-theme/iah-educacional/` — tema mínimo, sem plugins, distribuído como `.zip`.

**Motivo:** A hospedagem contratada administra instâncias WordPress (não FTP simples), exigindo um tema para publicar.

**Alternativas descartadas:** Editor visual do WordPress sem tema custom (rejeitado — não reproduzia a identidade visual do IAH).

**Impacto futuro:** Artefato **temporário**, não atualizado automaticamente a partir do Next.js. Mudanças na Landing exigem replicação manual aqui até a virada de domínio (D-008, checklist em `DEPLOY.md`).

## D-007 — Route Groups: Landing e Plataforma coexistem *(supersede D-004)* (14/07/2026)

**Decisão:** Um único projeto Next.js com route groups: `(marketing)` serve `/`, `(platform)` serve a Plataforma sob wrapper `.dark`. Raiz compartilhada só com `<html>`, fontes, metadata base.

**Motivo:** As duas frentes precisavam coexistir sob o mesmo projeto, compartilhando Design System, sem refatoração profunda — opção deliberadamente mínima para um MVP.

**Alternativas descartadas:** Dois projetos/repositórios separados (rejeitado — duplicaria Design System e infraestrutura de deploy).

**Impacto futuro:** Estrutura de rotas vigente até hoje (ver `PRODUCT.md`).

## D-008 — Remoção do `output: export`; aplicação Next com servidor *(supersede D-005)* (14/07/2026)

**Decisão:** Remover `output: "export"`. Projeto passa a ser aplicação Next.js com servidor (Node.js/Vercel), hospedando os dois blocos no mesmo deploy. WordPress (D-006) segue no domínio como solução temporária.

**Motivo:** Formulário de demonstração (envio real de e-mail) e a Plataforma definitiva (autenticação, banco, IA) exigem servidor.

**Alternativas descartadas:** Manter export estático e usar serviço de formulário 100% client-side (rejeitado — não sustenta a Plataforma).

**Impacto futuro:** Deploy-alvo exige runtime Node (Vercel). `/api/contato`, SSR, `robots.txt`, `sitemap.xml`, OG dinâmico funcionam em produção.

## D-009 — Design System unificado, fonte única de verdade (14/07/2026)

**Decisão:** `app/src/styles/tokens.css` como fonte única — primitivas da marca (`--iah-*`) + tokens semânticos (contrato shadcn/ui). Plataforma adotou a marca IAH (primário de violeta para cyan `#42e8f1`).

**Motivo:** Após D-007, Landing e Plataforma tinham dois vocabulários visuais distintos — dívida consciente que precisava ser quitada.

**Alternativas descartadas:** Manter dois sistemas de tokens sincronizados manualmente (rejeitado — historicamente diverge, como já havia acontecido).

**Impacto futuro:** Mudança de marca acontece em um único arquivo e propaga para os dois blocos.

## D-010 — Dark Mode como identidade principal; Light Mode planejado (14/07/2026)

**Decisão:** Premium Dark é a identidade visual principal e único tema efetivamente ativo. Tokens do tema claro existem em `tokens.css` como suporte planejado, sem alternância funcional ainda.

**Motivo:** Precisava de uma posição clara sobre tema visual, tanto para a marca quanto para o menu de Acessibilidade (D-003), que já expõe "Modo Claro" sem efeito.

**Alternativas descartadas:** Implementar alternância funcional imediatamente (adiado — não era prioridade da Sprint; ver critério de simplicidade em `VISION.md`).

**Impacto futuro:** Nenhuma tela nova depende de "modo claro" funcional até a alternância existir; toda cor nova ainda é definida para os dois temas em `tokens.css`.

## D-011 — MVP para sala de aula precede a versão comercial (14/07/2026)

**Decisão:** A Plataforma deve ser utilizável em sala de aula antes de qualquer investimento em escala comercial.

**Motivo:** O IAH está sendo construído como sistema de ensino real, não como demonstração de vendas vazia.

**Alternativas descartadas:** Priorizar onboarding self-service e planos pagos antes de validação pedagógica (rejeitado).

**Impacto futuro:** Superada em parte por D-014 (pivô para "demonstração de agosto" como objetivo organizador mais específico), mas o princípio de fundo permanece.

## D-012 — Git, GitHub e Vercel como fluxo padrão de publicação (14–15/07/2026)

**Decisão:** Repositório Git local com branch `main`, remoto privado `github.com/profabioege/iah-platform`, Vercel conectada com Root Directory `app`. Todo push na `main` gera deploy automático em `iah-platform.vercel.app`. Resolução de URL do site prioriza `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → `localhost`, para que `canonical`/OG nunca apontem para um domínio ainda não conectado.

**Motivo:** Projeto não tinha controle de versão nem deploy; toda mudança ficava só local. `.git` anterior (herdado de uma cópia em OneDrive) estava vazio — sem histórico real a preservar.

**Alternativas descartadas:** Netlify ou host Node próprio (Vercel escolhida por ser o encaixe nativo de Next.js com servidor).

**Impacto futuro:** Fluxo obrigatório para toda entrega: Desenvolvimento → Git → GitHub → Vercel → Validação → Produção (ver `DEPLOY.md`). Domínio definitivo (`iaheducacional.com.br`) ainda não migrado — checklist em `DEPLOY.md`.

## D-013 — Componente Logo oficial da marca (16/07/2026)

**Decisão:** `components/brand/logo.tsx` — SVG isolado num único arquivo, variantes `dark`/`light`/`auto`, wordmark opcional. Substitui o marcador provisório de três barras usado desde D-002.

**Motivo:** Integrar a identidade visual oficial do IAH (fornecida pelo usuário) em toda a plataforma, com um único ponto de substituição para o vetor definitivo.

**Alternativas descartadas:** Embutir o SVG diretamente em cada ponto de uso (rejeitado — impediria trocar a marca num lugar só).

**Impacto futuro:** Qualquer atualização futura do vetor da marca é uma edição de um arquivo; todos os pontos de uso (sidebar, header, rodapé, `/entrar`, favicon, OG) são automaticamente atualizados.

## D-014 — Pivô de estratégia: MVP de demonstração para agosto/2026 (16/07/2026)

**Decisão:** Toda priorização passa a responder "isso melhora a demonstração/uso real em sala de aula em agosto?". O sequenciamento original de Sprints temáticas (`05_ROADMAP.md`: Missões → Biblioteca → Professor → Aluno → Diário → Integrações → Mentor IA) é substituído por entregas ordenadas pela jornada mínima de uma aula completa.

**Motivo:** Confirmação de um piloto comercial real em agosto/2026 com o mantenedor de uma escola onde o fundador já leciona a disciplina — prazo e interlocutor concretos, não hipotéticos.

**Alternativas descartadas:** Manter o roadmap temático original (rejeitado — construiria Biblioteca/Integrações antes de o aluno conseguir concluir uma única aula de ponta a ponta).

**Impacto futuro:** Módulos foram entregues fora da ordem original: navegação de Missão, Produção, Reflexão/Diário, identidade de marca, conexão do Dashboard, Painel do Professor (simulado), auditoria de demonstração — nessa ordem. Backlog temático original passa a ser pós-piloto (ver `ROADMAP.md`).

## D-015 — Dados simulados como padrão de transição para o Painel do Professor (16/07/2026)

**Decisão:** `ClassMonitorReader` como contrato de domínio; `simulated-class-monitor` como única implementação hoje, com turma fictícia de 11 alunos autorizada e identificada na interface ("dados simulados para demonstração").

**Motivo:** Autenticação e banco de dados ainda não existem; o Painel do Professor precisa existir para a demonstração de agosto mesmo assim.

**Alternativas descartadas:** Adiar o Painel do Professor até haver banco real (rejeitado — o piloto de agosto precisa da experiência completa, incluindo o professor).

**Impacto futuro:** Trocar a fonte real de dados é substituir a implementação injetada em `professor/page.tsx`, sem alterar `ClassPanel` nem qualquer componente de interface.

## D-016 — Itens de navegação não construídos ficam explicitamente "Em breve" (16/07/2026)

**Decisão:** Itens da sidebar sem rota implementada (Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil) recebem selo "Em breve", ficam desabilitados e sem cursor de clique.

**Motivo:** Auditoria da demonstração de agosto identificou que itens clicáveis sem efeito nenhum passam a impressão de protótipo malfeito diante de um gestor.

**Alternativas descartadas:** Remover os itens da sidebar até serem construídos (rejeitado — esconde a visão de produto completa, que é parte do discurso comercial).

**Impacto futuro:** Todo novo item de menu nasce com `href` (navegável) ou explicitamente marcado "Em breve" — nunca um meio-termo silencioso.

## D-017 — Esqueleto de carregamento para telas que leem estado no cliente (16/07/2026)

**Decisão:** Toda tela cujo conteúdo depende de leitura client-side (localStorage) — hoje o Dashboard — mostra um `Skeleton` com o layout final antes de os dados carregarem, em vez de retornar `null`.

**Motivo:** Auditoria de demonstração encontrou um flash de tela em branco no primeiro carregamento do Dashboard (SSR não tem acesso a localStorage).

**Alternativas descartadas:** Mover a leitura de progresso para o servidor (rejeitado — exigiria banco de dados, fora de escopo antes do piloto).

**Impacto futuro:** Padrão a repetir em qualquer tela futura que dependa de estado do dispositivo antes de haver banco de dados.

## D-018 — Consolidação da documentação em 5 arquivos oficiais (16/07/2026)

**Decisão:** `docs/VISION.md`, `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/STATUS.md` e `docs/DECISIONS.md` passam a ser a única memória oficial do projeto, consultada antes de qualquer implementação e atualizada ao final de cada tarefa. Os documentos fragmentados anteriores (`01_PRODUCT_VISION.md` a `07_DECISIONS.md`, `ARCHITECTURE.md`) tornam-se redirecionamentos; `DOMAIN_MODEL.md`, `DESIGN_SYSTEM.md`, `03_BRAND_GUIDELINES.md`, `MISSION.md`, `MISSION_TEMPLATE.md` e `DEPLOY.md` permanecem como referências técnicas complementares, linkadas a partir de `PRODUCT.md`/`STATUS.md`.

**Motivo:** Reduzir permanentemente o consumo de contexto nas próximas sessões de trabalho — 16 arquivos de documentação parcialmente sobrepostos e, em alguns pontos, desatualizados em relação ao código real.

**Alternativas descartadas:** Manter todos os documentos fragmentados anteriores como igualmente oficiais (rejeitado — é exatamente a causa do problema que esta decisão resolve).

**Impacto futuro:** Toda decisão, status e visão nova é registrada nestes 5 arquivos, não em novos documentos soltos. Documentos técnicos complementares (Design System, Domain Model, Brand, Deploy) continuam existindo, mas não duplicam o que já está nos 5 oficiais.

## D-019 — Módulo `integrations` com abstração de provedor, sem dependência externa (16/07/2026)

**Decisão:** Novo módulo `modules/integrations`, com dois contratos de domínio — `AuthProvider` (login) e `ClassroomProvider` (cursos, alunos, publicação de Missão) — cada um com uma implementação simulada (`mock*`, usada hoje) e um stub do provedor real (`google*`, lança erro se chamado). `isGoogleWorkspaceConfigured()` é o único ponto que decide se há credencial real; hoje sempre `false`. Nenhum pacote novo foi instalado (nem SDK do Google, nem NextAuth/Auth.js) — a Sprint foi escopada para não depender de Google Cloud, OAuth ou qualquer API externa.

**Motivo:** Sprint M03 pediu "preparar toda a arquitetura para Google Workspace" para o piloto institucional, mas a análise de risco (aviso de "app não verificado", verificação de escopos restritos do Google podendo levar semanas, necessidade de credenciais reais que não existem) levou a reduzir o escopo para infraestrutura pura — arquitetura pronta, zero risco externo antes de agosto.

**Alternativas descartadas:** Implementar OAuth real com o Google agora (rejeitado — dependeria de credenciais que não existem e poderia introduzir a tela de "app não verificado" bem na frente do mantenedor, o oposto do que a demonstração precisa). Colocar os contratos dentro de `modules/classroom` existente (rejeitado — esse módulo já tem um significado específico, acompanhamento de turma via `ClassMonitorReader`; misturar geraria ambiguidade de nome com "sala de aula do Google").

**Impacto futuro:** Quando as credenciais do Google Cloud existirem (ver `GOOGLE_WORKSPACE.md`), a ativação é: definir as variáveis de ambiente, implementar de fato os dois stubs, e trocar a injeção de `mock*` para `google*` nos pontos que os consomem — nenhum componente de UI muda. O mesmo par de contratos comporta um terceiro provedor futuro (ex.: Microsoft Teams) sem alterar `AuthProvider`/`ClassroomProvider`.

## D-020 — Modelo institucional consolidado em `DOMAIN_MODEL.md`, com `Ano Letivo` como entidade (16/07/2026)

**Decisão:** `docs/DOMAIN_MODEL.md` passa a ser o modelo conceitual institucional completo (Identidade & Acesso, Instituição, Currículo & Autoria, Aprendizagem & Entrega, Integrações, Colaboração, Acervo, Operação), incorporando o conteúdo que antes vivia em `06_DOMAIN_MODEL.md` (agora um redirecionamento). Nova entidade `Ano Letivo` (antes só um atributo solto de Turma) para suportar múltiplos períodos letivos sem confundir dados. Novas seções: "Fluxo completo: Instituição → Professor → Turma → Aluno → Missão" e "Origens de dados futuras" (cadastro manual, CSV, Google Classroom, Microsoft Teams — todas alimentando o mesmo modelo interno via `ClassroomProvider`, D-019). Nomes de entidade permanecem em português (convenção do domínio de produto); tabela de equivalência mapeia para os nomes em inglês que o código usará quando implementado (`Institution`, `AcademicYear`, `Teacher`, `Classroom`, `Student`, `Mission`, `MissionProgress`, `Reflection`, `Production`). Nenhum código, UI, página ou rota foi alterado.

**Motivo:** a Sprint "Modelo Institucional" pediu a criação de `docs/DOMAIN_MODEL.md`, mas um modelo conceitual já existia — mais completo — em `06_DOMAIN_MODEL.md`, um dos arquivos numerados que D-018 previu tornarem-se redirecionamentos (e que `PRODUCT.md` já linkava como `DOMAIN_MODEL.md`, nome que nunca chegou a receber o conteúdo real). Criar um terceiro documento do zero repetiria exatamente a fragmentação que D-018 corrigiu.

**Alternativas descartadas:** Escrever um novo `DOMAIN_MODEL.md` do zero com só as 9 entidades pedidas na Sprint, ignorando `06_DOMAIN_MODEL.md` (rejeitado — duplicaria conteúdo já pensado com mais profundidade, incluindo separação Identidade/Papel e template/instância, essenciais para não repetir erro de modelagem depois). Nomear as entidades em inglês no documento conceitual (rejeitado — quebra a convenção já registrada de português no domínio de produto; a tabela de equivalência resolve sem abrir exceção).

**Impacto futuro:** Qualquer nova Sprint de modelagem de domínio edita `DOMAIN_MODEL.md` diretamente, nunca cria um documento paralelo. Ao implementar Autenticação real/Persistência em banco (`ROADMAP.md`, itens 2–3), os módulos `identity`, `institution` e `curriculum` nascem seguindo os contextos já definidos aqui, com identificadores de código em inglês conforme a tabela de equivalência.

## D-021 — Entidades `ClassroomIntegration`/`IntegrationProvider`/`Indicadores` e arquitetura de importação (`ImportProvider`) (16/07/2026)

**Decisão:** `DOMAIN_MODEL.md` ganha três entidades: `ClassroomIntegration` (especialização de `Integração`, o registro de uma sincronização de turma configurada), `IntegrationProvider` (contrato-guarda-chuva que nomeia a família `AuthProvider`/`ClassroomProvider`/`ImportProvider`, já reconhecível como o módulo `modules/integrations`) e `Indicadores` (projeção agregada e derivada — nunca persistida diretamente — base do futuro Painel do Gestor). Novo documento `docs/IMPORT_ARCHITECTURE.md` define o contrato conceitual `ImportProvider` (`listClassrooms`/`listStudents`/`importClassroom`) e as 5 implementações futuras previstas (`ManualImportProvider`, `CSVImportProvider`, `GoogleClassroomProvider`, `MicrosoftTeamsProvider`, `MoodleProvider`), com fluxo de revisão humana obrigatória antes de qualquer gravação e reconciliação de identidade por e-mail. Nenhum código, UI, página, rota ou banco de dados foi alterado.

**Motivo:** a Sprint "Fundação da Plataforma" pediu explicitamente essas entidades e uma camada de importação formal, que a Sprint anterior (D-020) só havia esboçado como uma seção dentro de `DOMAIN_MODEL.md`. Também pediu atualizar um `MASTER.md`, que não existe no projeto — `HANDOFF.md` já cumpre esse papel ("documento único de transição de contexto") desde D-018; criar um `MASTER.md` paralelo recriaria a fragmentação que D-018 e D-020 já corrigiram duas vezes nesta mesma sessão. Decisão: não criar `MASTER.md`; `HANDOFF.md` foi atualizado no lugar dele.

**Alternativas descartadas:** Manter a arquitetura de importação só como uma subseção de `DOMAIN_MODEL.md` (rejeitado — o pedido explícito de um documento dedicado, e o volume de conteúdo próprio — 5 implementações, fluxo, reconciliação de identidade — justificam um arquivo próprio, como já ocorreu com `GOOGLE_WORKSPACE.md`). Criar `MASTER.md` do zero espelhando `HANDOFF.md` (rejeitado — dois documentos com o mesmo propósito divergem com o tempo; é exatamente o problema que D-018 resolveu).

**Impacto futuro:** Quando um novo provedor de importação for implementado (Sprint futura), a checklist é: implementar `ImportProvider` em `infrastructure/` (ou especializar `ClassroomProvider`, se tiver API), sem alterar `Turma`/`Aluno`/`Matrícula` nem qualquer tela — ver "Pontos de extensão" em `IMPORT_ARCHITECTURE.md`. Se o usuário pedir novamente um `MASTER.md`, a resposta é apontar para `HANDOFF.md`, não duplicar.

## D-022 — Motor de autoria: decomposição de `Mission` em 10 entidades, com versionamento (16/07/2026)

**Decisão:** Novo `docs/AUTHORING_MODEL.md`, deep-dive do contexto Currículo & Autoria (já mapeado em alto nível em D-020/`DOMAIN_MODEL.md`). Formaliza 10 entidades — `MissionTemplate`, `MissionSection`, `Evidence`, `Challenge`, `EvaluationCriteria`, `ReflectionGuide`, `TeacherGuide`, `Competency`, `LearningObjective`, `DidacticMaterial` — e uma estratégia de versionamento (unidade de versão = `MissionTemplate` inteiro; `EvaluationCriteria`/`Competency`/`DidacticMaterial` têm ciclo de vida próprio, por serem reutilizáveis entre Missões). Nomes em inglês (diferente de D-020): são nomes já formatados como identificador de código, não conceitos de produto em português como Escola/Turma/Aluno. Nenhum código, UI, página ou rota foi alterado.

**Motivo:** Ao inspecionar `app/src/content/missions/01-a-fabrica-de-noticias.ts` para fundamentar o modelo, ficou evidente que os 4 itens do Dossiê de Auditoria (`Evidence`) e o Guia de Investigação + Critérios de Auditoria (`EvaluationCriteria`) hoje são strings soltas dentro de `didacticMaterials`, e a chave de correção (`groundTruth`) existe **só como comentário de código** ("CHAVE DO PROFESSOR") — nunca como dado, nunca visível ao Professor na Plataforma. Essa é a lacuna concreta que motivou a decomposição, não um exercício abstrato.

**Alternativas descartadas:** Manter tudo dentro do campo único `Mission` (rejeitado — é exatamente o que gera a mistura Evidence/EvaluationCriteria dentro de `didacticMaterials` hoje). Versionar cada sub-entidade independentemente do `MissionTemplate` pai (rejeitado — cria uma matriz combinatória de versões impossível de auditar; a unidade de versão é o template inteiro).

**Impacto futuro:** A Missão 02 (`ROADMAP.md`, backlog item 4) pode nascer com o `Mission` plano de hoje sem esperar por este modelo — a decomposição é aditiva, não bloqueante. Quando um editor de autoria (fora do arquivo TypeScript direto) for necessário, este é o esquema a implementar; a prioridade entre isso e os demais itens do backlog não foi decidida.

## D-023 — Núcleo de persistência multi-tenant: Supabase/PostgreSQL sem Prisma, banco como stub até haver credenciais (16/07/2026)

**Decisão:** Novo módulo `modules/platform` — o núcleo institucional multi-tenant do IAH — com as camadas: `domain/` (12 entidades com `institutionId` + contratos de repositório que exigem `institutionId` como primeiro parâmetro de todo método), `services/` (`computeClassIndicators`, projeção pura nunca persistida; `ImportService`, com preview separado de gravação), `infrastructure/` (`SeedRepositories` em memória, em uso; `DatabaseRepositories` como stub padrão D-019; `repository-factory` como único ponto de troca), `seeds/` (dados de demonstração rotulados, nunca persistidos). Schema inicial em SQL puro versionado (`app/db/migrations/0001_initial_schema.sql`), sem nenhum `INSERT`. Contrato `ImportProvider` implementado em `modules/integrations/import` com 6 provedores (manual funcional + 5 stubs: CSV, Google, Microsoft, Moodle, API). Stack escolhida: **Supabase (PostgreSQL), sem Prisma** — justificativa completa em `PERSISTENCE.md`. Nenhuma página consome o módulo ainda; a UI segue nos stores atuais.

**Motivo:** Sprint "Núcleo da Plataforma" pediu a arquitetura de persistência definitiva sem tocar na UI. Supabase já era dependência instalada e previsto no `ROADMAP.md` para autenticação — zero pacote novo (regra do `CLAUDE.md`); Prisma adicionaria codegen e peso sem benefício no volume atual de queries. Reconciliações com o modelo já documentado, feitas antes de codificar: `Indicator` não vira tabela (é projeção, `DOMAIN_MODEL.md`); `IntegrationProvider` não vira tabela (é contrato, D-019/D-021 — persiste-se `ClassroomIntegration` com coluna `provider`); `Mission` continua conteúdo em arquivo com tabela-registro só de metadados; `Enrollment` entrou no schema (entidade de pleno direito no `DOMAIN_MODEL.md`); `ImportProvider` ficou só-leitura, com a gravação movida para o `ImportService` (`IMPORT_ARCHITECTURE.md` atualizado).

**Alternativas descartadas:** Prisma (codegen + dependência nova sem ganho agora; os contratos permitem adotá-lo depois trocando só `database-repositories.ts`). PostgreSQL auto-hospedado (custo operacional sem equipe). Implementar as queries Supabase de verdade já (rejeitado — não existe banco/credencial contra o qual testá-las; query nunca executada é código especulativo apresentado como pronto). Um banco por escola (rejeitado — isolamento é lógico, por `institution_id` + contrato + futura RLS).

**Impacto futuro:** A troca seed → banco real acontece só na `repository-factory`, seguindo o checklist de 7 passos em `PERSISTENCE.md` (credenciais → migrations → implementar os stubs → auth → RLS → migrar páginas → aposentar `simulated-class-monitor`). A duplicação transitória entre o seed de demonstração e o `simulated-class-monitor` é deliberada e documentada — desaparece quando o Painel do Professor passar a ler do `platform`.

## D-024 — Camada Google Classroom plugável e Import Wizard sem OAuth/banco (16/07/2026)

**Decisão:** Novo módulo `modules/integrations/google-classroom` (types/dto/contracts/mappers/repositories/services/mock) que adapta o Google ao contrato genérico `ImportProvider` — nada fora dele conhece tipos Google. `ClassroomService` real (orquestra repo+mappers) já pronto; camada de dados (`repositories/`) é stub até haver OAuth; `mockClassroomService` fornece dados simulados rotulados. `ClassroomSyncService` (em `modules/platform`, genérico) compõe o `ImportService` e registra `ClassroomSyncState` (nova entidade + tabela `0002`). Import Wizard (`/professor/importar`, 6 passos) e seção "Turmas" no Painel do Professor construídos sobre dados simulados, com aviso explícito e Resumo declarando que nada foi gravado. Contratos de entrega de Missão (`mission-delivery.ts`: `MissionAssignment`, `AssistedEvaluationService`) criados como arquitetura, sem implementação.

**Motivo:** Sprint "M06 — Google Classroom + Piloto Beryon" pediu a infraestrutura de importação de turmas reais sem OAuth ainda. Reconciliações antes de codar: (a) o módulo foi para `modules/integrations/google-classroom`, não `src/integrations/...` — evita uma terceira casa paralela de integrações contra D-001/D-019/D-023; (b) `ClassroomSyncService` compõe o `ImportService` em vez de duplicar o fluxo, e ficou genérico (não Google-específico), honrando "a plataforma nunca depende da origem"; (c) o Wizard rotula os dados como simulados e não finge persistência (D-015); (d) o botão "Visualizar" aponta para destino real (D-016).

**Alternativas descartadas:** Criar seeds com o nome "Colégio Beryon" e alunos fictícios atribuídos a ele (rejeitado — fabricar registros de uma instituição real é diferente de uma escola declaradamente de demonstração; a prontidão real depende de OAuth+banco, documentada em `GOOGLE_CLASSROOM_INTEGRATION.md`). Implementar as chamadas HTTP reais à Classroom API já (rejeitado — sem credenciais, seria código nunca executado; o stub em `repositories/` é o único ponto que falta). Dar ao `ClassroomSyncService` poder de gravar direto (rejeitado — a gravação é do `ImportService`, mesma regra de D-023).

**Impacto futuro:** Ativação do Google real segue "Expansão futura" em `GOOGLE_CLASSROOM_INTEGRATION.md` (OAuth → implementar o repository stub → banco → auth → só então entrega de Missão). Microsoft Teams / Moodle entram como módulos irmãos do google-classroom, cada um com seus mappers, sem tocar em `platform`.

## D-025 — Autenticação real: Auth.js v5 + Google, sessão JWT, provisionamento automático fechado por allowlist (16/07/2026)

**Decisão:** Auth.js v5 (`next-auth@beta`, única dependência nova, pedida na Sprint M07) com provider Google exclusivo. Config dividida em `auth.config.ts` (edge-safe, usada pelo middleware que protege `/dashboard`, `/missoes`, `/diario`, `/professor`) e `auth.ts` (Node, com provisionamento). **Sessão JWT** — persistente via cookie assinado; sem tabela de sessões (ela só existe na estratégia "database" do Auth.js; criar tabela morta seria pior que documentar o desvio do pedido original). Primeiro login provisiona automaticamente `users` → `teachers` → `profiles` (migration `0003_identity.sql`), associando à Instituição de `AUTH_DEFAULT_INSTITUTION_SLUG`. **Allowlist fechada por padrão** (`AUTH_ALLOWED_EMAILS`): sem ela, ninguém entra. **Instituição nunca é criada automaticamente** — inserida pelo responsável real via `SUPABASE.md`. Sem credenciais, tudo degrada para o modo demonstração intacto (mesma filosofia `isConfigured` de D-019/D-023). Toda autenticação passa pelo contrato `AuthProvider` (D-019), agora com implementação real (`authJsAuthProvider`) escolhida por `getAuthProvider()`.

**Motivo:** Sprint M07 — primeiro usuário real (o fundador). As queries Supabase do provisionamento foram escritas agora (desvio consciente da regra "sem query especulativa" de D-023): são o núcleo do critério de sucesso da Sprint e serão exercitadas no primeiro login real; o restante dos repositórios de banco continua stub.

**Alternativas descartadas:** Sessão "database" com adapter Supabase (rejeitado — mais uma dependência, service key exposta a mais superfícies e duplicação de identidade entre o schema do adapter e nossas tabelas de domínio). Login aberto a qualquer conta Google (rejeitado — a plataforma do fundador ficaria pública). Criar a Instituição automaticamente no primeiro login (rejeitado — tenant fantasma silencioso; a linha do Colégio Beryon é dado real, inserido pelo usuário real, coerente com a recusa de D-024 a fabricar registros do Beryon). Remover mocks agora (item 11 da Sprint; rejeitado — nada deixou de fazer sentido: sem credenciais, todos sustentam o modo demonstração; a aposentadoria segue o checklist de `PERSISTENCE.md`).

**Impacto futuro:** Ativar login real = executar os passos de console de `AUTHENTICATION.md`/`SUPABASE.md` e definir as variáveis — zero mudança de código. O mesmo OAuth client do Google servirá aos escopos do Classroom na Sprint seguinte. RLS entra quando houver acesso client-side (checklist `PERSISTENCE.md`, passo 5).
