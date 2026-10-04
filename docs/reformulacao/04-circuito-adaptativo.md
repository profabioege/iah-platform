# Incremento 3: circuito adaptativo por habilidade

Decisão registrada em `DECISIONS.md` D-051. Está na branch `reform/em-curriculo-banco-questoes`, que **não foi publicada**.

Escolhas do Founder em 03/10/2026:

- **modo híbrido**: o reforço na mesma habilidade é automático; o avanço para a próxima é decisão do professor;
- **ritmo contínuo**: o aluno entrega uma rodada e já pode pedir a próxima;
- **erro típico por alternativa**: fica para um incremento seguinte.

## Como funciona

| Etapa | O que acontece | Onde está |
|---|---|---|
| 1. Ligar | O professor liga o circuito da turma. A primeira habilidade da sequência é liberada para todos os alunos. | `/professor/circuito` |
| 2. Rodada | O aluno pede uma rodada. O **banco** escolhe 3 questões aprovadas da habilidade liberada e cria uma lista pessoal (`kind = 'circuito'`). | `/dashboard/circuito` e `iah_circuit_next_round` |
| 3. Responder | É a mesma tela das listas: a correção é feita no banco e o gabarito e a resolução só aparecem depois da entrega. | `/dashboard/listas/[id]` |
| 4. Estado | Cada habilidade tem um estado, calculado por regra explícita a partir das respostas entregues. | `domain/adaptive.ts` |
| 5. Reforço | Se ainda não consolidou, o aluno pede a próxima rodada na mesma habilidade. Questões já vistas nunca se repetem. | automático |
| 6. Avanço | Quem consolidou aparece como "pronto para avançar". O professor libera a próxima habilidade; também pode liberar antes, se quiser. | `adaptive_unlocks` |

A **sequência** segue a ordem do planejamento da turma: primeiro o período, depois o código da habilidade.

## Estado por habilidade (regra v1)

| Estado | Regra (últimas 5 respostas da habilidade) |
|---|---|
| Sem evidência | Nenhuma resposta |
| Em desenvolvimento | Menos de 60% de acerto |
| Consolidando | 60% de acerto ou mais |
| Consolidado | Pelo menos 4 respostas, 80% de acerto ou mais **e** a última resposta certa |

Com menos de 3 respostas, a tela mostra "pouca evidência". O estado é um **indicador**: não é nota, não é TRI e não é proficiência. Por isso a tela sempre mostra junto quantas o aluno acertou, por exemplo "4 de 5 recentes".

**O que conta como evidência:**

- rodadas do circuito, que contam para a habilidade-alvo da rodada;
- listas do professor, que contam para a habilidade escolhida na tela. Listas antigas, sem habilidade-alvo, contam para a habilidade oficial da questão.

**Nível da próxima rodada**, definido pelo resultado da última rodada na habilidade:

| Resultado da última rodada | Nível | Ordem de escolha pelo rótulo editorial |
|---|---|---|
| Errou mais da metade | apoio | "fácil" primeiro |
| Acertou tudo | desafio | "difícil" primeiro |
| Outro resultado | regular | "média" primeiro |

O nível só muda a ordem de escolha. Questão não aprovada nunca entra.

## O que o banco garante (migração 0019)

- **Rodada pessoal**: só o aluno a quem a rodada pertence a alcança. Ela não aparece para os colegas nem em "Listas".
- **Rodada só nasce pelo circuito**: o professor não consegue criar uma rodada na mão, e o aluno não escolhe questões.
- **Liberação**: o aluno só recebe rodadas de habilidade liberada pelo professor e prevista no planejamento da turma. A liberação é um registro permanente, e só o professor da turma libera.
- **Questões elegíveis**:
  - só versões **aprovadas**, da escola ou do Catálogo IAH;
  - só com vínculo **oficial** ou **confirmado** por revisão humana; sugestão não revisada não entra em rodada automática;
  - nunca uma questão que o aluno já recebeu, em qualquer versão.
- **Rodada aberta**: se o aluno pede uma rodada com outra ainda aberta, recebe a mesma de volta, sem duplicar.
- **Banco esgotado** gera um aviso claro em vez de repetir questões. O painel do professor também alerta quando há menos de 6 questões disponíveis numa habilidade.
- **Circuito pausado** não gera rodada nova.

## Testes (04/10/2026)

- **Unitários:** 409, incluindo 8 novos das regras do circuito.
- **Integração com banco real:** 57, incluindo 9 novos em `tests/pilot/adaptive-circuit.test.mjs`. Alterei quatro regras da migração de propósito para ver se os testes percebiam, e perceberam as quatro:
  - rodada visível a colegas;
  - sugestão não revisada entrando na rodada;
  - questão repetida;
  - rodada sem liberação do professor.
- **Outras verificações:** 59 testes da fila, 19 migrações válidas e build de produção sem erros.
- **Percurso pelo navegador (7 de 7 verificações):** servidor de produção e banco descartável. O professor liga o circuito; o aluno faz duas rodadas e consolida; o painel mostra "pronto para avançar"; o professor libera; o aluno passa para a nova habilidade; um colega recebe 404 ao tentar abrir a rodada; o log do servidor fica sem erros.

## Limites e próximos passos

1. **Quantidade de questões**: no recorte provisório há 2 questões por habilidade, então o reforço se esgota logo. O circuito só fica útil com o Catálogo aprovado (que depende dos microdados e da licença) ou com questões inéditas IAH.
2. **Revisita** de habilidade consolidada, para checar retenção depois de algumas semanas: ainda não foi feita.
3. **Erro típico** por alternativa: incremento seguinte, por decisão do Founder.
4. **MentorIAH** explicando o erro e **geração de questões com IA**: ficam para depois. Qualquer questão gerada terá de passar pela revisão.
5. **Gabarito antecipado:** se a mesma questão estiver em duas listas do aluno, entregar uma libera o gabarito da outra. O circuito nunca repete questão, mas o professor ainda pode montar uma lista com uma questão que o aluno já viu.
6. **Regras v1**: os limites são editoriais e precisam ser ajustados com o uso real, com evidência.
