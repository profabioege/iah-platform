# Status — IAH Educacional

Fotografia do estado atual do projeto. **Este é o primeiro documento a consultar antes de qualquer nova implementação.** Atualizado ao final de cada tarefa — se este arquivo diverge do código, o código manda, mas a divergência deve ser corrigida aqui imediatamente.

## Estado atual

Projeto em **fase de preparação do piloto comercial de agosto/2026**. A Plataforma executa uma jornada completa de aula (aluno) e um painel de acompanhamento (professor) para a Missão 01. A Landing está publicada e capta demonstrações. Nenhuma autenticação real, nenhum banco de dados — persistência do aluno em localStorage; turma do professor é simulada (autorizada).

## Último commit

`35621ed` — *fix(demo): 3 ajustes de maior impacto da auditoria de agosto* (16/07/2026), branch `main`.

## Último deploy

**https://iah-platform.vercel.app** — ambiente oficial de homologação. Deploy automático a cada push na `main` (Vercel conectada ao GitHub `profabioege/iah-platform`, privado). Validado manualmente no navegador após o commit acima: fluxo Landing → Entrar → Dashboard → Missão → Produção → Reflexão → Painel do Professor, sem erros de console.

Domínio definitivo `iaheducacional.com.br` **ainda serve o WordPress temporário** — virada de DNS pendente (checklist em `DEPLOY.md`).

## Funcionalidades prontas

- Landing institucional completa (`/`), com `/contato` (formulário + e-mails institucionais).
- Abertura da Plataforma (`/entrar`, sem autenticação real).
- Dashboard (`/dashboard`) com Missão ativa real e progresso do dispositivo.
- Lista e detalhe de Missão (`/missoes`, `/missoes/[id]`) — Missão 01 "A Fábrica de Notícias" com os 11 blocos.
- Produção do Aluno (autosave, entrega, reabertura).
- Reflexão + Diário do Auditor (`/diario`), liberada após a entrega da produção.
- Painel do Professor (`/professor`) com turma simulada (11 alunos), 8 estados, filtro por status, abertura de produção/reflexão.
- Identidade visual oficial (logo, favicon, Open Graph) aplicada em toda a superfície.
- CI/CD completo (Git → GitHub → Vercel).

## Funcionalidades em andamento / lacunas conhecidas

- **Dossiê de Auditoria da Missão 01 não existe como conteúdo navegável** — o Desafio pede para auditar 4 manchetes que não estão implementadas (Material Didático/Ferramentas de IA são só texto). **Esta é a lacuna mais crítica para a demonstração de agosto.**
- Sidebar tem 6 itens intencionalmente desabilitados ("Em breve"): Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil.
- Menu de Acessibilidade tem interface completa mas nenhum efeito persiste ainda.
- Modo Claro existe como tokens, sem alternância funcional na interface.
- Formulário de demonstração da Landing está em modo `mailto:` (Resend pronto, dormente — falta `RESEND_API_KEY`).

## Próxima tarefa

Implementar o **Dossiê de Auditoria da Missão 01** (4 manchetes + guia de verificação, como conteúdo em arquivo) — ver `ROADMAP.md`, "Sprint seguinte".

## Riscos conhecidos

- **Risco de demonstração:** sem o Dossiê, o aluno não consegue executar o Desafio de verdade diante do mantenedor — maior risco identificado até agora para o piloto de agosto.
- **Dados do aluno vivem só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real sem banco.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados, não a turma real do professor.
- **Sem autenticação:** qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.

## Pendências

- Definir `RESEND_API_KEY` (e domínio verificado no Resend) para o formulário de contato sair do modo `mailto:`.
- Acesso ao DNS de `iaheducacional.com.br` para a futura virada do domínio (ver `DEPLOY.md`).
- Proteção da branch `main` no GitHub (exigir Pull Request) — recomendado, não implementado.
