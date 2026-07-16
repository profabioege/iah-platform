# Roadmap — IAH Educacional

Fonte oficial e única de verdade sobre **o que já foi entregue e o que vem a seguir**. Estado em 16/07/2026, após commit `35621ed`.

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

## Sprint atual

**Nenhuma em execução.** Última tarefa concluída: consolidação de documentação (este conjunto de arquivos). Ver `STATUS.md` para a próxima tarefa recomendada.

## Sprint seguinte (recomendada)

**Dossiê de Auditoria da Missão 01** — a lacuna mais crítica identificada na auditoria de demonstração: o Desafio da Missão 01 manda "auditar as 4 manchetes do Dossiê", mas o Dossiê não existe como conteúdo navegável — Material Didático e Ferramentas de IA são texto não-clicável. Sem isso, o aluno não consegue executar o Desafio de verdade.

**Critérios de aceite:**
- [ ] As 4 manchetes do Dossiê existem como conteúdo real (parte verdadeiras, parte fabricadas), navegável/legível dentro da tela da Missão.
- [ ] O guia de verificação (5 perguntas) está presente e consultável.
- [ ] Segue o padrão de conteúdo versionado em arquivo (`src/content/missions/`), sem banco de dados.
- [ ] Validado no fluxo completo Landing → Entrar → Missão → Produção → Reflexão, no ambiente de homologação.

## Backlog (pós-piloto de agosto, sem data)

Prioridade **decrescente** — cada item exige plano de implementação explícito antes de virar código, e reavaliação contra os critérios de `VISION.md` (o piloto pode reordenar tudo abaixo):

1. **Biblioteca** — acervo de Material Didático navegável, ligado às Missões.
2. **Autenticação real** — Supabase; login por papel (aluno/professor); acesso do Painel do Professor restrito à turma real.
3. **Persistência em banco** — substituir `local-student-work-store` e `simulated-class-monitor` por implementações reais dos mesmos contratos (`StudentWork`, `ClassMonitorReader`), sem mudar UI.
4. **Segunda Missão** — validar que "cadastrar arquivo de conteúdo" realmente escala sem tocar em interface.
5. **Diário do Auditor — privacidade** — controle explícito de compartilhamento professor↔aluno (hoje toda reflexão salva é visível ao "professor" simulado).
6. **Projetos** — produção autoral maior, individual ou em grupo.
7. **Integrações** — Google Classroom, Google Agenda, Canva.
8. **Mentor IA** — assistente de IA com registro de proveniência por uso.
9. **Modo Claro funcional** — hoje só os tokens existem; falta a alternância na interface (o menu de Acessibilidade já expõe a opção sem efeito).
10. **Virada de domínio** — `iaheducacional.com.br` migrar do WordPress temporário para a aplicação Next.js (checklist em `DEPLOY.md`).
