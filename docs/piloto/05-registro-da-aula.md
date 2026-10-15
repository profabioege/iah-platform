# Piloto 1ª série A — Registro da aula e instrumentos de medição

Três fontes, cada uma com o seu papel:

1. **Banco (automático, agregado)** — `piloto-metricas-aula.cmd` gera, só com contagens e tempos: matriculados, alunos que entraram na janela da aula, alunos que tentaram e não entraram, iniciaram, entregaram produção, registraram uso da IA, registraram reflexão, concluíram, devolutivas do professor, tempo de início até entrega (p50/p90/máx).
2. **Registro manual da aula** (professor + apoio) — presença, pedidos de ajuda, falhas e tempos do professor. **Sem nomes**: use o número da credencial ou do computador.
3. **Avaliação breve dos alunos** — anônima, 1 minuto.

## 1. Ficha da aula (professor)

| Campo | Valor |
|---|---|
| Data / horário de início e fim | |
| Matriculados na 1ª A (lista importada) | 35 |
| **Presentes** (chamada) | |
| Ausentes | |
| Presentes que **entraram** na plataforma | (do relatório automático) |
| Presentes que **não entraram** — por causa técnica | (do registro de ocorrências) |
| Alunos que usaram o kit papel | |
| Ferramenta de IA usada | ferramenta aprovada / Plano B projetado |
| Houve acionamento do plano de continuidade? Por quanto tempo? | |
| **Tempo de preparação do professor** (atribuir, imprimir, Classroom, conferência) — minutos | |
| **Tempo de acompanhamento** durante a aula (painel, suporte) — minutos | |
| **Tempo de devolutiva** depois da aula (avaliar os dois eixos) — minutos e nº de entregas avaliadas | |

> Ausência ≠ falha técnica: aluno **ausente** não entra na taxa de acesso; aluno **presente que não conseguiu entrar ou entregar por problema técnico** é falha técnica, com causa registrada abaixo.

## 2. Registro de ocorrências (uma linha por ocorrência)

| Hora | Credencial/computador nº | Tipo | Descrição curta | Resolvido? Como? | Minutos perdidos |
|---|---|---|---|---|---|
| | | | | | |

**Tipos** (use exatamente um):
- `T-credencial` — senha, troca de senha, bloqueio;
- `T-plataforma` — erro, lentidão (>10 s), tela que não salva;
- `T-rede` — internet da escola;
- `T-equipamento` — computador, navegador, teclado;
- `T-ferramenta-IA` — ferramenta externa indisponível ou bloqueada;
- `P-compreensao` — dúvida sobre a tarefa (pedagógico, não técnico);
- `P-tempo` — não terminou a tempo (pedagógico).

## 3. Avaliação breve dos alunos (anônima, 1 min)

Papel no fim da aula ou formulário da escola **sem coleta de e-mail**. Escala de 1 a 5.

1. **Clareza** — Eu entendi o que era para fazer na missão. (1 = nada · 5 = totalmente)
2. **Dificuldade** — A missão foi… (1 = muito fácil · 3 = na medida · 5 = muito difícil)
3. **Utilidade percebida** — O que fiz hoje me ajuda a desconfiar melhor de notícias e de textos gerados por IA. (1 = nada · 5 = muito)
4. (opcional) Uma coisa que melhoraria a aula: ______

Tabulação: média e distribuição de cada pergunta; respostas abertas agrupadas por tema. Não guardar as folhas depois de tabular.

## 4. Depois da aula (operador)

1. `piloto-metricas-aula.cmd inst-beryon class-beryon-2026-1a <início> <fim> C:\piloto\aula\metricas.json`
2. `piloto-copia-seguranca.cmd C:\piloto\copias\piloto-pos-aula.json`
3. Preencher o relatório para a mantenedora (`06-relatorio-mantenedora-modelo.md`) só com números agregados.
