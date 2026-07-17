# Roteiro de Apresentação — Demonstração ao Mantenedor (Piloto de Agosto/2026)

Escrito a partir do ensaio técnico realizado em 16/07/2026 na Vercel de produção (`https://iah-platform.vercel.app`). É o texto de apoio para quem conduz a demonstração real. Os tempos por etapa são **estimativas calibradas pelo volume de conteúdo de cada tela**, não uma medição de fala humana — ver "Limite deste ensaio" no final.

## Preparação antes de começar

- Abrir a Vercel de produção num dispositivo com `localStorage` limpo, para reproduzir a primeira experiência de um aluno novo.
- Deixar explícito, ao chegar no Painel do Professor, que a turma ali é simulada ("Turma de demonstração") — nunca apresentar como dado real.

## Etapas e tempo estimado

1. **Landing (`/`) — ~1 min.** Apontar a desambiguação imediata ("não é AVA, não é chatbot, é sistema completo") e passar rapidamente pelos 6 pilares — não ler a página inteira em voz alta, ela é longa.
2. **`/demonstracao` — ~30s.** Mostrar que existe um funil de conversão dedicado; não preencher o formulário ao vivo.
3. **`/entrar` → Dashboard — ~30s.** Mostrar a Missão ativa e o progresso zerado do dispositivo.
4. **Missão 01 — Objetivo e Contexto — ~1 min.** Ler em voz alta a pergunta motriz: *"Se uma máquina pode escrever qualquer notícia, quem — ou o quê — decide o que é verdade?"*
5. **Dossiê de Auditoria — 4 itens, hipótese + veredito — ~5–6 min.** Núcleo da aula. Convidar o mantenedor a formar a própria hipótese em pelo menos 1 item antes de revelar o veredito — é o momento que mais demonstra o método.
6. **Manchete gerada por IA + análise — ~1–2 min.** Mostrar o aluno usando IA como objeto de estudo (gerar uma manchete falsa), não como fonte de resposta.
7. **Entrega do Relatório + Reflexão + Diário — ~1–1,5 min.** Mostrar a entrega, a liberação da Reflexão só depois da entrega, e o registro aparecendo no Diário do Auditor.
8. **Painel do Professor — ~1,5–2 min.** Mostrar os 8 estados de acompanhamento e reforçar que a turma é simulada.

**Total estimado: ~13–14 minutos** de percurso guiado. Dentro da meta de 15 minutos, mas com pouca folga — qualquer pergunta do mantenedor durante o Dossiê (etapa mais rica, itens 5–6) pode facilmente estourar o tempo.

## Achado a decidir (não corrigido nesta Sprint)

A Landing promete, no CTA final, "uma demonstração de **20 minutos**" ([app/src/app/(marketing)/page.tsx:446](../app/src/app/(marketing)/page.tsx)), enquanto a meta interna registrada em `ROADMAP.md`/`STATUS.md` é de **15 minutos**. É uma divergência de copy vs. meta interna, não uma quebra visual — decisão de produto (qual é a meta real) fica para o usuário; ajustar o lado que estiver desatualizado depois da decisão.

## Limite deste ensaio

Este ensaio validou tecnicamente o percurso completo (todas as telas carregam sem erro, formulário/relatório/reflexão funcionam ponta a ponta, sem quebra de layout em 5 larguras: desktop, notebook 1366×768, projetor 1024×768, tablet, mobile). O percurso funcional automatizado levou cerca de 5 minutos, mas **isso não é comparável a uma apresentação humana falada** — é navegação por automação, não leitura em voz alta com pausas para perguntas. A validação real do tempo de 15 minutos exige um ensaio humano, com este roteiro lido em voz alta, cronômetro em mão.
