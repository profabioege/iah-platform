# Candidata local — apresentação Beryon (17/09/2026)

Branch local `demo/apresentacao-beryon-2026-09-17`, base `8f788578a537115c0e7a36f7314b2de12696427a`.
Candidata para revisão do fundador. Não publicada, sem push, sem Vercel e sem Supabase.

## Decisões

- **Base obrigatória `8f78857`.** Preserva login seguro, `IAH_AUTH_MODE`,
  `requirePlatformDataMode()`, guards fail-closed, gestor simplificado, fluxo do
  aluno e Missão 01. Nenhum desses arquivos foi alterado.
- **`3246b7f` só como fonte seletiva.** Sem merge de linhagem. Transportado:
  painel do professor de três cartões, Planejador Conversacional do DocentIAH e
  fluxo demonstrativo da sondagem diagnóstica.
- **Nenhuma área privada nova.** As telas novas vivem dentro das áreas já
  protegidas pelo middleware: `/professor/docente-iah`, `/professor/avaliacoes`,
  `/dashboard/sondagens` e `/gestor/sondagens`.
- **Papéis técnicos da base apenas** (`admin` → `/gestor`, `teacher`, `student`).
  A divisão Direção/Coordenação/Mantenedor (`ca6e3e0`) não foi transportada; os
  indicadores de sondagem da Coordenação foram adaptados para `/gestor/sondagens`.
- **Funcionalidades novas só no modo `demo`.** Telas passam por
  `requirePlatformDataMode()`; Server Actions recusam fora do demo antes de
  resolver a sessão; a fábrica da sondagem recusa em vez de cair no seed.
  Repositórios Supabase, migrations e o gateway de IA não fazem parte da candidata.
- **DocentIAH:** apenas o planejador determinístico (regras locais, sem IA
  externa). Slides, Conexões IAH como tela própria e "salvar material" ficaram
  fora — o rascunho é identificado como demonstrativo e não é salvo.
- **Sondagem:** repositório seed em memória do servidor, identificado na tela;
  aplicação fictícia na 1º EM A (turma da jornada, a mesma da Missão 01).
- **Dados fictícios:** o professor do seed demo passa a ser "Professor(a) de
  demonstração" (`professor@institutohorizonte.edu.br`); nenhuma tela exibe o
  nome do fundador. O seed do banco real (`db/seed/seed-demo.mjs`) não foi alterado.
- **MentorIAH:** não transportado; segue "Em breve", sem link.
- **Navegação:** menus levam cada papel só a rotas da própria área; "Professores"
  e "Missões" do gestor abrem as visões do próprio painel (`/gestor?visao=`).

## Executar localmente

```bash
cd app
IAH_AUTH_MODE=demo NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER=true npm run build
IAH_AUTH_MODE=demo NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER=true npx next start -p 3015
```

Contas fictícias do seed: `diretor@`, `professor@` e `aluno01@`…`aluno10@`
`institutohorizonte.edu.br`, com a senha demo do seed (não exibida na interface).

## Limitações conhecidas

- Estado da sondagem vive na memória do servidor: reiniciar apaga entregas e correções.
- Publicação de Missão e Estúdio de Missões usam o armazenamento local do navegador (comportamento da base).
- O extrator do DocentIAH reconhece séries no formato do catálogo ("2ª série", "9º ano").
- Publicar a sondagem para outra turma exige preencher datas no formulário.
- A visão "Missões" do gestor mostra contadores de Lessons/Missions da base, que dependem do estado local.

Garantias travadas em `app/tests/presentation-candidate.test.mjs`.
