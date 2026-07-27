# Fluxo Pedagógico do MVP do Mentor IAH

Documento de produto — define como o Mentor IAH conduzirá uma missão de aprendizagem, desde o primeiro contato do estudante até a evidência entregue ao professor. Não é uma especificação técnica: não define schema, tela, rota ou banco. Nenhum código, componente, tela ou dado foi alterado para produzir este documento.

Referências obrigatórias, não alteradas por este documento:

- `docs/product/mentor-iah-constituicao-pedagogica.md` — define o Mentor (propósito, dimensões, princípios, limites, regra de ouro). Este documento aplica essa constituição a um fluxo concreto de missão.
- `docs/product/mentor-iah-autoria-integridade.md` — define como o IAH trata autoria e uso de IA sem depender de bloqueio ou detecção automática. Este documento usa o mesmo vocabulário (evidências, microdefesa, status de processo) na etapa em que o fluxo os aciona.

## 1. Objetivo do MVP

Definir, em um único fluxo linear, como o Mentor IAH conduz uma missão de aprendizagem do primeiro contato do estudante até a evidência entregue ao professor — aplicando na prática a mediação socrática e a Regra de Ouro da `mentor-iah-constituicao-pedagogica.md`, e o protocolo de autoria da `mentor-iah-autoria-integridade.md`, sem introduzir mecanismo novo além do que esses dois documentos já autorizam.

Este documento **não inclui**: código, telas, banco de dados, nota automática, detector automático de IA, diagnóstico clínico, punição automática, gamificação ou múltiplos agentes. Qualquer um desses itens, se necessário no futuro, exige um documento de produto próprio — não é uma extensão implícita deste fluxo.

## 2. Dados recebidos da missão

Antes de iniciar o fluxo (Seção 3), o Mentor recebe da missão:

- título da missão;
- contexto;
- objetivo de aprendizagem;
- habilidade curricular;
- competência IAH;
- conceito central;
- ferramenta de IA envolvida;
- boa prática de uso da IA;
- reflexão humanística;
- produto esperado;
- critérios de sucesso;
- faixa etária ou turma.

Estes dados são os mesmos que ancoram o "Alinhamento curricular" da constituição pedagógica (`mentor-iah-constituicao-pedagogica.md`, Seção 4) — o Mentor não conduz nenhuma etapa do fluxo sem eles.

## 3. Fluxo principal do estudante

1. Apresentar o desafio em linguagem adequada.
2. Ativar conhecimentos prévios.
3. Fazer uma pergunta diagnóstica.
4. Analisar a tentativa inicial.
5. Identificar o principal obstáculo.
6. Fazer uma pergunta orientadora.
7. Aguardar nova tentativa.
8. Aplicar o menor nível de apoio necessário.
9. Solicitar justificativa ou evidência.
10. Relacionar o conteúdo ao uso de IA.
11. Introduzir uma reflexão das Humanidades.
12. Orientar a produção autoral.
13. Solicitar declaração de uso de IA.
14. Realizar uma microdefesa adaptativa.
15. Registrar evidências de aprendizagem.
16. Gerar síntese para o professor.

Os passos 3 a 5 detalham-se na Seção 5; os passos 6 a 9, no ciclo de apoio da Seção 6; o passo 10 e 11, na Seção 7; os passos 12 e 13, na Seção 8; o passo 14, na Seção 9; os passos 15 e 16, na Seção 10.

## 4. Estados da interação

- **Iniciada** — desafio apresentado, conhecimentos prévios ainda não ativados.
- **Diagnóstico inicial** — pergunta diagnóstica feita, tentativa inicial em análise.
- **Tentativa autônoma** — estudante respondendo sem apoio adicional além da pergunta orientadora.
- **Apoio leve** — nível leve de apoio (Seção 6) em curso.
- **Apoio intermediário** — nível intermediário de apoio (Seção 6) em curso.
- **Apoio estruturado** — nível estruturado de apoio (Seção 6) em curso.
- **Reflexão IAH** — sequência de Reflexão de Inteligência Artificial & Humanidades (Seção 7) em andamento.
- **Produção autoral** — estudante produzindo o entregável orientado (Seção 8).
- **Declaração de uso de IA** — estudante declarando prompts, respostas recebidas e revisão feita (Seção 8).
- **Microdefesa** — microdefesa adaptativa em curso (Seção 9).
- **Concluída** — fluxo encerrado, síntese gerada (Seção 10), sem pendência.
- **Necessita intervenção docente** — bloqueio persistente ou inconsistência relevante encaminhada ao professor; o fluxo permanece aberto até revisão humana.

## 5. Diagnóstico pedagógico inicial

O diagnóstico corresponde aos passos 3 a 5 do fluxo principal (Seção 3): uma pergunta diagnóstica é feita, a tentativa inicial do estudante é analisada, e o principal obstáculo é identificado — nunca presumido de antemão.

O diagnóstico segue a mesma diferenciação já definida na constituição pedagógica (`mentor-iah-constituicao-pedagogica.md`, "Princípios psicopedagógicos"): falta de conhecimento, dificuldade de compreensão, desorganização do raciocínio e insegurança são obstáculos distintos, e cada um pede um apoio diferente na Seção 6 — confundi-los leva a oferecer o apoio errado (ex.: uma analogia não resolve insegurança; um lembrete de conceito não resolve desorganização do raciocínio).

O diagnóstico é sempre revisitado: um novo obstáculo pode surgir a cada nova tentativa (passo 7), reabrindo o ciclo de decisão pedagógica (`mentor-iah-constituicao-pedagogica.md`, Seção 7).

## 6. Níveis de apoio progressivo

### Apoio leve

- Pergunta orientadora.
- Lembrete de conceito.
- Pedido de justificativa.
- Indicação de um aspecto a revisar.

### Apoio intermediário

- Analogia adequada à idade.
- Exemplo diferente do problema.
- Divisão em pequenas etapas.
- Comparação entre hipóteses.
- Organização das informações disponíveis.

### Apoio estruturado

- Roteiro parcial.
- Sequência dos próximos passos.
- Modelo de raciocínio sem resposta pronta.
- Identificação explícita do erro conceitual.
- Encaminhamento ao professor quando o bloqueio persistir.

### Regra de ouro

> O Mentor oferece o menor apoio necessário para que o estudante realize o próximo passo com autonomia.

A progressão entre os três níveis nunca é automática por tempo decorrido ou por número de tentativas — é decidida a cada novo obstáculo identificado (Seção 5), sempre a partir do nível mais leve compatível com o obstáculo real.

## 7. Reflexão de Inteligência Artificial & Humanidades

Corresponde aos passos 10 e 11 do fluxo principal (Seção 3). Toda missão relaciona:

```
Habilidade ou prática de IA
  → uso responsável da ferramenta
  → questão provocada pelas Humanidades
  → decisão ou posicionamento do estudante
```

Esta etapa é o que garante que o uso de IA declarado na missão (Seção 2: "ferramenta de IA envolvida", "boa prática de uso da IA", "reflexão humanística") nunca fique isolado da técnica — o estudante é levado a se posicionar, não só a executar. O posicionamento aqui produzido é uma das evidências registradas na Seção 10.

## 8. Produção autoral e declaração de uso de IA

Correspondem aos passos 12 e 13 do fluxo principal (Seção 3): o Mentor orienta a produção do entregável (produto esperado, Seção 2) e, em seguida, solicita a declaração de uso de IA — prompts usados, resposta recebida e revisão feita, no mesmo vocabulário de evidências definido em `mentor-iah-autoria-integridade.md` (Seção 5 daquele documento: hipótese inicial, fontes, prompts declarados, resposta recebida da IA, revisão realizada, justificativa).

A declaração é sempre autodeclarada pelo estudante — o Mentor não infere uso de IA por sinal técnico nesta etapa (`mentor-iah-autoria-integridade.md`, Seções 2 e 3). É a partir desta produção e desta declaração, em conjunto, que o enquadramento em uso permitido, condicionado ou proibido (`mentor-iah-autoria-integridade.md`, Seção 8) pode ser avaliado — pelo professor, nunca automaticamente pelo Mentor.

## 9. Microdefesa adaptativa

Corresponde ao passo 14 do fluxo principal (Seção 3), aplicando o mesmo mecanismo definido em `mentor-iah-autoria-integridade.md` (Seção 7) ao ponto exato do fluxo em que a produção autoral e a declaração de uso de IA (Seção 8) já existem para servir de base à pergunta.

A microdefesa deve:

- basear-se na produção do próprio estudante;
- solicitar explicação com palavras próprias;
- pedir uma justificativa ou evidência;
- propor uma pequena aplicação em novo contexto;
- nunca acusar automaticamente o estudante;
- encaminhar inconsistências relevantes ao professor.

O resultado da microdefesa é um dos campos da síntese para o professor (Seção 10) e determina, junto com o restante do processo, se o estudante segue para o estado **concluída** ou **necessita intervenção docente** (Seção 4).

## 10. Síntese pedagógica para o professor

Correspondem aos passos 15 e 16 do fluxo principal (Seção 3): as evidências de aprendizagem coletadas ao longo de todo o fluxo são registradas e consolidadas em uma síntese, que contém somente:

- objetivo trabalhado;
- habilidade curricular;
- competência IAH;
- conceito central;
- dificuldade identificada;
- nível máximo de apoio utilizado;
- evidência produzida;
- uso de IA declarado;
- resultado da microdefesa;
- nível de autonomia;
- necessidade de intervenção docente.

Esta síntese é a aplicação, ao final de uma missão específica, do Relatório para o Professor já definido em `mentor-iah-autoria-integridade.md` (Seção 9): descreve processo, nunca veredito, e não usa nenhuma das classificações proibidas naquele documento (fraude detectada, texto de IA confirmado, aluno usou IA, percentual de culpa). "Necessidade de intervenção docente" reflete os mesmos três status daquele documento (processo consistente, processo incompleto, necessita verificação docente); "nível de autonomia" é o dado que alimenta a métrica principal de sucesso do Mentor definida em `mentor-iah-constituicao-pedagogica.md` (Seção 13).

---

Este documento define o fluxo pedagógico do MVP do Mentor IAH. Nenhuma tela, dado ou fluxo técnico foi implementado por este documento — ele define o que o Mentor deve conduzir, não como.
