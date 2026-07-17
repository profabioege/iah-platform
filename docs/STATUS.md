# Status — IAH Educacional

Fotografia do estado atual do projeto. **Este é o primeiro documento a consultar antes de qualquer nova implementação.** Atualizado ao final de cada tarefa — se este arquivo diverge do código, o código manda, mas a divergência deve ser corrigida aqui imediatamente. Histórico entrega-a-entrega em `CHANGELOG.md`. **Retomando o projeto numa nova conversa (janela de contexto reiniciada): leia `HANDOFF.md` primeiro** — é o resumo único de todo o histórico, escrito para esse exato momento.

## Estado atual

Projeto em **fase de preparação do piloto comercial de agosto/2026**, com um funil comercial completo: Landing (pitch) → `/demonstracao` (conversão) → confirmação. A Plataforma executa uma jornada completa de aula (aluno) e um painel de acompanhamento (professor) para a Missão 01, com o Dossiê de Auditoria completo. Nenhuma autenticação real, nenhum banco de dados — persistência do aluno em localStorage; turma do professor é simulada (autorizada, rotulada como "Turma de demonstração").

## Último commit

`c0681aa` (anterior a esta tarefa) — *feat(landing): M02 — Comercialização: página /demonstracao (funil de conversão)* (16/07/2026), branch `main`. Este ciclo (Ciclo 2) começou com o Ensaio cronometrado da demonstração de agosto — ver "Ciclo 2 — Ensaio da demonstração" abaixo. Ver `CHANGELOG.md` para o histórico completo.

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

## Funcionalidades em andamento / lacunas conhecidas

- Sidebar tem 6 itens intencionalmente desabilitados ("Em breve"): Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil.
- Menu de Acessibilidade tem interface completa mas nenhum efeito persiste ainda.
- Modo Claro existe como tokens, sem alternância funcional na interface.
- Formulário de demonstração da Landing está em modo `mailto:` (Resend pronto, dormente — falta `RESEND_API_KEY`).

## Próxima tarefa

Decidir a meta real da demonstração (15 ou 20 minutos — achado desta Sprint) e, com isso resolvido, rodar o ensaio humano cronometrado (roteiro de `ROTEIRO-DEMONSTRACAO.md` lido em voz alta) que a validação técnica desta Sprint não substitui. Ver `ROADMAP.md`, "Sprint seguinte", para o próximo item de backlog depois disso.

## Riscos conhecidos

- **Meta de tempo da demonstração ainda não validada por um ensaio humano:** a validação técnica desta Sprint confirmou que o fluxo funciona sem erro e sem quebra visual em 5 larguras, mas não mede tempo de fala humana — a meta de 15 (ou 20?) minutos segue não confirmada na prática.
- **Dados do aluno vivem só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real sem banco.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados, não a turma real do professor.
- **Sem autenticação:** qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.

## Pendências

- **Divergência de meta de tempo:** Landing promete "20 minutos" ([app/src/app/(marketing)/page.tsx:446](../app/src/app/(marketing)/page.tsx)), `ROADMAP.md`/`STATUS.md` registram meta de 15 minutos — decidir qual é a real e ajustar o outro lado.
- Definir `RESEND_API_KEY` (e domínio verificado no Resend) para os formulários de demonstração/contato saírem do modo `mailto:`.
- Acesso ao DNS de `iaheducacional.com.br` para a futura virada do domínio (ver `DEPLOY.md`).
- Proteção da branch `main` no GitHub (exigir Pull Request) — recomendado, não implementado.
- **Observação de SEO (não corrigida, fora de escopo desta Sprint):** páginas do bloco `(marketing)` além da home (`/demonstracao`, `/contato`) renderizam `<title>` sem o sufixo "| IAH Educacional", porque o layout do bloco define `title: { absolute: ... }` sem `template`, quebrando a herança do template do layout raiz. Padrão pré-existente (já valia para `/contato` antes desta Sprint), não introduzido agora — mas vale corrigir numa futura passada de SEO.
