# Roadmap — IAH Educacional

Fonte oficial e única de verdade sobre **o que já foi entregue e o que vem a seguir**. Estado em 16/07/2026.

## Norte atual do produto

**Objetivo comercial:** fechar o piloto com o mantenedor da escola onde o fundador já leciona IA, em **agosto/2026**. A pergunta que decide toda priorização: *"isso melhora a demonstração/o uso real em sala de aula em agosto?"* — se não, adia (ver `VISION.md`, critérios de aceitação).

Este norte **substitui** o sequenciamento original de Sprints temáticas (Missões → Biblioteca → Professor → Aluno → Diário → Integrações → Mentor IA). Módulos foram entregues fora dessa ordem, na sequência que o piloto de agosto exigia (ver "Funcionalidades concluídas"). Ver `DECISIONS.md` (D-014) para o registro desse pivô.

## Funcionalidades concluídas

| Entrega | O que ficou pronto |
|---|---|
| Estrutura inicial + App Shell | Sidebar, header, tema Premium Dark |
| Site institucional (Landing) | Hero, seções de posicionamento, formulário `/contato`, rodapé com e-mails institucionais |
| Git + GitHub + Vercel | Deploy contínuo; `main` → `iah-platform.vercel.app` automaticamente |
| Módulo `library` + Missão 01 | Entidade `Mission`, `MissionReader` local, conteúdo real "A Fábrica de Notícias" (11 blocos) |
| Navegação real da Plataforma | `/missoes`, `/missoes/[id]` — fim da navegação decorativa |
| Produção do Aluno | Autosave, entrega datada, reabertura — persistida no dispositivo |
| Reflexão + Diário do Auditor | `MissionWorkspace` unificado (produção+reflexão sem sobrescrita), `/diario` lista reflexões |
| Identidade visual oficial | Componente `Logo` reutilizável, aplicado em sidebar/header/rodapé/`/entrar`/favicon/OG |
| Dashboard conectado à Missão real | Fim dos cards estáticos; Missão ativa + progresso real; estados iniciada/em andamento/concluída |
| Painel do Professor | `/professor` — 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão (turma **simulada**, arquitetura pronta para banco) |
| Auditoria de demonstração (3 ajustes) | Link "Entrar" na Landing; sidebar honesta ("Em breve" nos itens não construídos); Dashboard sem flash em branco (skeleton) |
| Consolidação de contexto | Estes 5 documentos (`VISION`, `PRODUCT`, `ROADMAP`, `STATUS`, `DECISIONS`) como memória oficial única do projeto |
| Dossiê de Auditoria da Missão 01 | 4 manchetes reais de investigação (2 autênticas, 2 fabricadas — chave só no código-fonte), Guia de Investigação (5 critérios) e Critérios de Auditoria explícitos, com hipótese inicial + veredito final incorporados ao Desafio e à Produção |
| Ensaio da demonstração de agosto | Fluxo completo validado tecnicamente na Vercel (sem erro, sem quebra visual em 5 larguras); `ROTEIRO-DEMONSTRACAO.md` com roteiro de apresentação por etapa. Achado: divergência de meta de tempo (Landing promete 20 min, meta interna é 15 min) — não decidido ainda |
| M03 — Infraestrutura Google Workspace | `modules/integrations` (contratos `AuthProvider`/`ClassroomProvider`, mock em uso, stub Google sem chamada de rede), card "Integrações" no Painel do Professor, `GOOGLE_WORKSPACE.md`. Escopo original (OAuth/Classroom reais) reduzido após análise de risco — ver `DECISIONS.md` D-019 |

## Sprint atual

**Nenhuma em execução.** Última tarefa concluída: M03 — Infraestrutura Google Workspace. Próxima Sprint planejada abaixo, aguardando aprovação para implementar.

## Sprint seguinte (recomendada) — Painel do Gestor (MVP Comercial)

**Planejamento técnico e funcional** (não implementado ainda — ver instrução explícita de "apenas planejar").

### Por que este é o próximo passo

O formulário de `/demonstracao` já identifica o público-alvo por cargo (Diretor(a), Coordenador(a) pedagógico(a), Mantenedor(a), Professor(a)) — mas hoje a única visão pós-login é o Painel do Professor, operacional e granular (8 estados por aluno). Um Diretor/Mantenedor avaliando a plataforma não quer esse nível de detalhe; quer evidência rápida de adoção e de valor pedagógico. Isso serve diretamente o Norte do produto ("isso melhora a demonstração/uso real em agosto?").

### Indicadores que interessam a um Gestor (não a um Professor)

1. **Adesão da turma** — % de alunos que já iniciaram a Missão (visualizou ou além) vs. nunca acessou. Uma métrica, não 8 estados.
2. **Progresso agregado** — % da turma que concluiu a Missão (produção + reflexão), como stat único, não lista aluno a aluno.
3. **Evidência pedagógica (prova social)** — 1–2 trechos de reflexão em destaque, curados, mostrando a profundidade do pensamento crítico produzido — não a lista completa de produções (isso é papel do Painel do Professor).
4. **Competências desenvolvidas** — a lista já existente na Missão (`mission.competencies`: pensamento crítico, formulação de hipóteses, verificação de fontes, uso ético de IA, argumentação, letramento midiático) — contextualiza o que está sendo formado, sem repetir dado operacional.

Deliberadamente **fora** do escopo do Gestor: granularidade por aluno, filtros por status, abertura de produção individual — isso permanece exclusivo do Painel do Professor, para manter os dois papéis com propósitos distintos.

### Menor solução compatível com a arquitetura atual

- **Nenhum módulo novo.** Reaproveita `ClassMonitorReader`/`simulatedClassMonitor` (já usado por `/professor`) e `MissionReader`/`localMissionRepository` (já usado em toda a Plataforma).
- **Uma função pura de agregação** em `modules/classroom` (ex.: `summarizeClassProgress(students): ClassProgressSummary`), calculando adesão/progresso a partir dos mesmos `StudentMissionSnapshot[]` que o Painel do Professor já lê — sem duplicar fonte de dados.
- **Nova rota `/gestor`** em `(platform)`, seguindo exatamente o padrão de `professor/page.tsx` (server component, mesma injeção de dados, mesmo Design System — `Card`/`Badge`).
- **Item de navegação na sidebar**, do mesmo jeito que `/professor` hoje — sem "Em breve", porque será construído de fato.

### Riscos a decidir antes de implementar

- **Sem autenticação/papel** (mesmo risco já documentado para `/professor` e `/dashboard`): qualquer pessoa com a URL acessa `/gestor` — aceitável para demonstração controlada, não para uso público.
- **Privacidade do Diário** (backlog #5, ainda não resolvida): mostrar trechos de reflexão ao "Gestor" amplia a mesma exposição já sinalizada para o Professor — hoje é dado fictício autorizado, mas o desenho não deve pressupor que isso continua aceitável quando a turma for real.

**Critérios de aceite (quando aprovado para implementar):**
- [ ] `/gestor` mostra adesão, progresso agregado, 1–2 destaques de reflexão e competências desenvolvidas — sem lista aluno a aluno.
- [ ] Nenhum módulo novo; reaproveita os contratos `ClassMonitorReader`/`MissionReader` existentes.
- [ ] Validado em desktop/tablet/mobile, sem overflow, console limpo.
- [ ] Rotulado como "Turma de demonstração", mesmo padrão do Painel do Professor (D-015).

## Também pendente (não esquecido, fora desta Sprint)

- **Ensaio humano cronometrado da demonstração** — a validação técnica já feita não substitui um ensaio real com o roteiro lido em voz alta (ver `STATUS.md`).
- **Decidir a meta de tempo real** (15 ou 20 minutos — divergência entre Landing e `ROADMAP.md`/`STATUS.md`).
- **Google Workspace real** — criar projeto no Google Cloud Console quando o piloto exigir login/Classroom reais (ver `GOOGLE_WORKSPACE.md`).

## Backlog (pós-piloto de agosto, sem data)

Prioridade **decrescente** — cada item exige plano de implementação explícito antes de virar código, e reavaliação contra os critérios de `VISION.md` (o piloto pode reordenar tudo abaixo):

1. **Biblioteca** — acervo de Material Didático navegável, ligado às Missões.
2. **Autenticação real** — Supabase; login por papel (aluno/professor/gestor); acesso dos Painéis restrito à turma/escola real.
3. **Persistência em banco** — substituir `local-student-work-store` e `simulated-class-monitor` por implementações reais dos mesmos contratos (`StudentWork`, `ClassMonitorReader`), sem mudar UI.
4. **Segunda Missão** — validar que "cadastrar arquivo de conteúdo" realmente escala sem tocar em interface.
5. **Diário do Auditor — privacidade** — controle explícito de compartilhamento professor/gestor↔aluno (hoje toda reflexão salva é visível a ambos os painéis simulados).
6. **Projetos** — produção autoral maior, individual ou em grupo.
7. **Google Workspace real** — trocar os stubs de `modules/integrations` por implementações reais (OAuth + Classroom API), quando o projeto Google Cloud existir (ver `GOOGLE_WORKSPACE.md`).
8. **Mentor IA** — assistente de IA com registro de proveniência por uso.
9. **Modo Claro funcional** — hoje só os tokens existem; falta a alternância na interface (o menu de Acessibilidade já expõe a opção sem efeito).
10. **Virada de domínio** — `iaheducacional.com.br` migrar do WordPress temporário para a aplicação Next.js (checklist em `DEPLOY.md`).
