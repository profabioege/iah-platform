# Visão — IAH Educacional

Fonte oficial e única de verdade sobre **por que o IAH existe** e **o que ele não é**. Toda proposta de funcionalidade é avaliada contra este documento antes de virar código.

## Propósito

O IAH existe para que estudantes deixem de ser consumidores passivos de conteúdo sobre Inteligência Artificial e passem a ser **investigadores ativos da realidade** — capazes de questionar, verificar e produzir conhecimento com IA, e não apesar dela ou por causa dela.

A plataforma é um **laboratório digital de aprendizagem, investigação e produção de conhecimento**, onde o estudante assume o papel de **Auditor da Realidade**.

## Problema que resolve

Escolas que querem ensinar Inteligência Artificial de forma séria enfrentam três lacunas: falta de **metodologia própria** (a maioria recorre a cursos genéricos ou improviso), falta de **conteúdo autoral** alinhado a essa metodologia, e falta de uma **plataforma que sustente investigação real** em vez de apenas hospedar arquivos e avisos (o que um AVA tradicional já faz mal o suficiente). O IAH fecha as três lacunas de uma vez, sem exigir que o professor construa tudo do zero.

## Público-alvo

- **Alunos** do Ensino Médio matriculados na disciplina IAH.
- **Professores** que conduzem a disciplina — autores, mediadores e avaliadores da experiência.
- **Coordenação pedagógica**, que acompanha a implementação sem perder profundidade.
- **Diretores e mantenedores** de escolas particulares e redes de ensino — decisores da adoção institucional (o piloto comercial de agosto/2026 mira este público).

## Proposta de valor

Um sistema de ensino completo e pronto para uso — metodologia, conteúdo autoral e uso ético/crítico de IA — que o professor conduz em sala de aula real, sem depender de infraestrutura própria da escola nem de curso gravado genérico.

## Diferenciais

- **Metodologia própria**, expressa na estrutura padrão de Missão (ver `MISSION.md` e `MISSION_TEMPLATE.md`): objetivo, pergunta norteadora, contexto, desafio, produção, reflexão, entrega e competências.
- **Conteúdo didático autoral**, não genérico.
- **IA como objeto de estudo e apoio crítico** — nunca como fonte de resposta pronta; todo uso é registrado com finalidade pedagógica.
- **Diário do Auditor**: espaço reflexivo pessoal, não avaliativo, que registra a maturação do pensamento crítico do estudante.
- **Identidade visual de laboratório de IA** — Premium Dark, direto, sem estética corporativa de "sistema de gestão".
- **Painel do Professor** com acompanhamento em tempo real do estado de cada aluno na Missão.

## Objetivos comerciais

1. **Validar o produto em uma sala de aula real** antes de qualquer investimento em escala comercial (venda self-service, planos pagos, onboarding automatizado).
2. **Fechar o piloto comercial de agosto/2026** com o mantenedor da escola onde o fundador já leciona IA — este é hoje o objetivo comercial que organiza todas as prioridades de produto (ver `ROADMAP.md` e `STATUS.md`).
3. Só depois do piloto validado, avaliar expansão para outras escolas/redes.

## Princípios pedagógicos

**O IAH não é um AVA.** Um Ambiente Virtual de Aprendizagem organiza conteúdo. O IAH organiza **investigação**. Uma funcionalidade que só serve para "pendurar arquivo" ou "postar aviso" não pertence ao núcleo do produto.

**O conteúdo é protagonista.** A tecnologia serve a metodologia e o material autoral — nunca o contrário.

**A IA complementa o pensamento humano, não o substitui.** Toda ferramenta de IA é objeto de estudo e apoio crítico, com uso registrado e propósito pedagógico explícito. IA que "dá a resposta pronta" contraria o produto.

**O professor permanece no centro da experiência.** A plataforma amplia o alcance pedagógico do professor; não o substitui, não o contorna e não decide por ele.

**A investigação é mais importante que a resposta.** O valor está no processo — pergunta norteadora, contexto, dúvida, revisão de perspectiva. Métricas e telas não devem otimizar para "conclusão rápida" às custas desse processo.

**Toda funcionalidade deve possuir propósito pedagógico.** Se a resposta a "que aprendizagem isso sustenta?" for vaga, a funcionalidade não deve ser construída.

**Identidade separada de papel.** Uma pessoa pode ser aluno, professor ou administrador em contextos diferentes — o produto nunca assume que um papel é a identidade inteira de alguém.

**Autoria é diferente de entrega.** Conteúdo pedagógico (Curso, Módulo, Missão) é template versionável; o que o aluno produz é instância imutável daquele template num dado momento. Confundir os dois corrompe histórico.

## O que o IAH NÃO é

| O IAH não é | O IAH é |
|---|---|
| Um curso gravado | Investigação guiada, com professor no centro |
| Um AVA / LMS / "sistema de gestão escolar" | Um laboratório de produção de conhecimento |
| Um substituto do professor | Um apoio que amplia o alcance pedagógico |
| Um repositório de PDFs e avisos | Um ambiente vivo de missões, produção e reflexão |
| Uma ferramenta de chat de IA solta | Um sistema onde todo uso de IA tem propósito e registro pedagógico |
| Uma demonstração comercial vazia | Um sistema de ensino que precisa funcionar de verdade em sala de aula antes de ser vendido |

## Critérios para aceitar ou rejeitar novas funcionalidades

Antes de qualquer implementação, uma funcionalidade proposta passa por estas perguntas, nesta ordem:

1. **Ajuda a fechar o piloto de agosto?** Se a resposta é não, ela é adiada — a menos que seja consolidação de arquitetura explicitamente solicitada.
2. **Tem propósito pedagógico claro?** Se a resposta a "que aprendizagem isso sustenta?" for vaga, rejeitar.
3. **Mantém o professor no centro?** Rejeitar qualquer automação que substitua ou contorne a decisão do professor.
4. **Usa IA como objeto de estudo, nunca como resposta pronta?** Se a IA "resolve" o desafio pelo aluno, rejeitar ou redesenhar.
5. **Cabe no Design System existente?** Nenhuma cor, fonte, raio ou sombra nova fora de `app/src/styles/tokens.css`; nenhum componente novo fora de `components/ui` quando um já serve.
6. **É simples o suficiente?** Resolve a necessidade da Sprint atual — não antecipa arquitetura para requisitos hipotéticos.
7. **Foi autorizada explicitamente?** Dados mockados/simulados e telas fictícias exigem autorização explícita e devem ser identificáveis como tal (ver `CLAUDE.md`).

Se a funcionalidade passa nos 7 critérios, ela pode virar plano de implementação. Qualquer decisão arquitetural relevante tomada no caminho é registrada em `DECISIONS.md`.
