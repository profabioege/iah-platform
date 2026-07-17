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
