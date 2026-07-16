# Changelog — IAH Educacional

Histórico de entregas em ordem cronológica reversa. Cada entrada corresponde a uma Sprint ou tarefa concluída. Para o estado atual, ver `STATUS.md`; para o histórico de decisões arquiteturais, ver `DECISIONS.md`.

## 16/07/2026 — Experiência de demonstração comercial

Sprint focada em continuidade e polimento visual, sem funcionalidades novas — preparação para a demonstração ao mantenedor.

- **Landing**: copy revisada com foco em benefício para gestores (diretor, mantenedor, coordenação); os dois diferenciais que prometiam integrações inexistentes (Google Classroom, Canva/Agenda) foram substituídos por diferenciais reais e demonstráveis hoje (Painel do Professor, metodologia validada em sala real); CTA final reforçado ("veja o aluno concluindo uma aula real, não um slide").
- **Continuidade do fluxo**: banner "Aula concluída" na Missão ganhou links diretos para `/diario` e `/dashboard`, fechando o laço da jornada do aluno.
- **Estados de carregamento**: `MissionWorkspace` (produção/reflexão na Missão) e `DiarioList` (`/diario`) paravam de renderizar nada (`return null`) enquanto liam o dispositivo; agora mostram esqueleto (`Skeleton`) equivalente ao layout final.
- **Consistência do header**: o título da seção no header da Plataforma não reconhecia `/professor` e mostrava "Dashboard" por engano; corrigido.
- **Linguagem do Painel do Professor**: "dados simulados para demonstração" (tom de aviso/desculpa) trocado por "Turma de demonstração" (tom profissional, igualmente honesto).
- Validado em notebook (1366×768) e projetor (1920×1080): Landing, `/entrar`, `/dashboard`, `/missoes`, `/missoes/[id]`, `/diario`, `/professor` — sem overflow horizontal, sem sobreposição na Hero, console limpo.

## 16/07/2026 — Dossiê de Auditoria da Missão 01

- Missão 01 ganhou o Dossiê completo dentro da estrutura de 11 blocos existente: 4 itens de investigação (2 autênticos, 2 fabricados — chave de correção apenas em comentário de código), Guia de Investigação (5 critérios) e Critérios de Auditoria explícitos.
- Desafio e Produção do Aluno passaram a exigir hipótese inicial + veredito final justificado por item.
- Ver `DECISIONS.md` para o registro completo.

## 16/07/2026 — Consolidação da documentação

- Criados os 5 documentos oficiais (`VISION.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`) como única memória do projeto. Documentos fragmentados anteriores viraram redirecionamentos.

## 16/07/2026 — Auditoria de demonstração (3 ajustes)

- Link "Entrar" adicionado à navegação da Landing (antes não havia caminho da Landing para a Plataforma).
- Sidebar: itens não construídos ganharam selo "Em breve" e ficaram desabilitados.
- Dashboard: esqueleto de carregamento no lugar do flash de tela em branco.

## 16/07/2026 — Painel do Professor

- `/professor`: acompanhamento da turma com 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão. Turma simulada (arquitetura pronta para banco via `ClassMonitorReader`).

## 16/07/2026 — Identidade visual oficial

- Componente `Logo` reutilizável (variantes clara/escura, wordmark), aplicado em sidebar, header/rodapé da Landing, `/entrar`, favicon e Open Graph.

## 16/07/2026 — Dashboard conectado à Missão real

- Fim dos cards estáticos ("Radar IA", "Caso da Semana", "Missão 04"); Missão ativa e progresso real do dispositivo; estados iniciada/em andamento/concluída.

## 16/07/2026 — Registro de Aprendizagem (Reflexão + Diário)

- `MissionWorkspace` unifica produção e reflexão num único registro (evita sobrescrita); `/diario` lista as reflexões registradas.

## 16/07/2026 — Produção do Aluno

- Autosave, entrega datada e reabertura, persistidos no dispositivo (localStorage).

## 15/07/2026 — Navegação real da Plataforma

- `/missoes` e `/missoes/[id]` substituem a navegação decorativa da Sprint 1; Missão 01 "A Fábrica de Notícias" implementada com os 11 blocos (conteúdo ainda sem o Dossiê completo, adicionado depois).

## 14–15/07/2026 — Infraestrutura de publicação

- Git, GitHub (`profabioege/iah-platform`, privado) e Vercel conectados; deploy contínuo ativo em `iah-platform.vercel.app`.

## 13–14/07/2026 — Fundação do produto

- Estrutura inicial do projeto, App Shell da Plataforma (sidebar, header, tema Premium Dark), Site Institucional (Landing) com formulário de contato, Design System unificado (`tokens.css`), módulo `library` com a entidade `Mission`.
