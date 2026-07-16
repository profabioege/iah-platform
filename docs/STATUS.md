# Status — IAH Educacional

Fotografia do estado atual do projeto. **Este é o primeiro documento a consultar antes de qualquer nova implementação.** Atualizado ao final de cada tarefa — se este arquivo diverge do código, o código manda, mas a divergência deve ser corrigida aqui imediatamente.

## Estado atual

Projeto em **fase de preparação do piloto comercial de agosto/2026**. A Plataforma executa uma jornada completa de aula (aluno) e um painel de acompanhamento (professor) para a Missão 01. A Landing está publicada e capta demonstrações. Nenhuma autenticação real, nenhum banco de dados — persistência do aluno em localStorage; turma do professor é simulada (autorizada).

## Último commit

`1eac2f5` — *docs: consolidar memória oficial do projeto em 5 arquivos únicos* (16/07/2026), branch `main`. Conteúdo enriquecido da Missão 01 (Dossiê de Auditoria) já implementado neste momento, aguardando commit desta tarefa.

## Último deploy

**https://iah-platform.vercel.app** — ambiente oficial de homologação. Deploy automático a cada push na `main` (Vercel conectada ao GitHub `profabioege/iah-platform`, privado). Validado manualmente no navegador: fluxo Landing → Entrar → Dashboard → Missão → Produção → Reflexão → Painel do Professor, sem erros de console.

Domínio definitivo `iaheducacional.com.br` **ainda serve o WordPress temporário** — virada de DNS pendente (checklist em `DEPLOY.md`).

## Funcionalidades prontas

- Landing institucional completa (`/`), com `/contato` (formulário + e-mails institucionais).
- Abertura da Plataforma (`/entrar`, sem autenticação real).
- Dashboard (`/dashboard`) com Missão ativa real e progresso do dispositivo.
- Lista e detalhe de Missão (`/missoes`, `/missoes/[id]`) — Missão 01 "A Fábrica de Notícias" com os 11 blocos e o **Dossiê de Auditoria completo**: 4 manchetes reais de investigação (2 autênticas, 2 fabricadas — chave de correção só no código-fonte, nunca exibida ao aluno), Guia de Investigação (5 critérios: fonte, data/escopo, evidência, linguagem, coerência interna) e Critérios de Auditoria explícitos.
- Produção do Aluno (autosave, entrega, reabertura).
- Reflexão + Diário do Auditor (`/diario`), liberada após a entrega da produção.
- Painel do Professor (`/professor`) com turma simulada (11 alunos), 8 estados, filtro por status, abertura de produção/reflexão.
- Identidade visual oficial (logo, favicon, Open Graph) aplicada em toda a superfície.
- CI/CD completo (Git → GitHub → Vercel).

## Funcionalidades em andamento / lacunas conhecidas

- Sidebar tem 6 itens intencionalmente desabilitados ("Em breve"): Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil.
- Menu de Acessibilidade tem interface completa mas nenhum efeito persiste ainda.
- Modo Claro existe como tokens, sem alternância funcional na interface.
- Formulário de demonstração da Landing está em modo `mailto:` (Resend pronto, dormente — falta `RESEND_API_KEY`).

## Próxima tarefa

Ensaiar a demonstração de agosto ponta a ponta com o Dossiê real (Landing → Entrar → Dashboard → Missão → hipótese/veredito nos 4 itens → manchete gerada → Reflexão → Painel do Professor), cronometrando o tempo real de execução do Desafio — ver `ROADMAP.md`, "Sprint seguinte".

## Riscos conhecidos

- **Dados do aluno vivem só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real sem banco.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados, não a turma real do professor.
- **Sem autenticação:** qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.

## Pendências

- Definir `RESEND_API_KEY` (e domínio verificado no Resend) para o formulário de contato sair do modo `mailto:`.
- Acesso ao DNS de `iaheducacional.com.br` para a futura virada do domínio (ver `DEPLOY.md`).
- Proteção da branch `main` no GitHub (exigir Pull Request) — recomendado, não implementado.
