# Persistência da Síntese e Avaliação Assistida do MVP do MentorIAH

Documento de produto — define como a síntese pedagógica gerada pelo MentorIAH se torna uma nota final: as únicas ações que o professor tem disponíveis, o fluxo de decisão, os status possíveis e o que fica registrado para auditoria. Não é uma especificação técnica: não define schema, tela, rota ou banco. Nenhum código, migration, tela ou dado foi alterado para produzir este documento.

Referências obrigatórias, não alteradas por este documento:

- `docs/product/mentor-iah-fluxo-pedagogico-mvp.md` — Seção 10 define a síntese pedagógica que o Mentor entrega ao professor ao final de uma missão. Este documento começa exatamente onde aquele termina: o que o professor faz com essa síntese.
- `docs/product/mentor-iah-autoria-integridade.md` — Seção 9 define que o Relatório para o Professor descreve processo, nunca veredito. A nota sugerida e sua justificativa (Seção 2 deste documento) seguem o mesmo princípio: são subsídio para a decisão docente, não um veredito automático.
- `docs/product/mentor-iah-constituicao-pedagogica.md` — Seção 11 define a relação entre Mentor, estudante e professor, com o professor como autoridade final. Este documento aplica esse princípio à avaliação assistida.

## 1. Objetivo

Simplificar a avaliação assistida do MVP: no início, o professor tem somente duas ações disponíveis diante de uma nota sugerida pelo Mentor.

1. Validar nota sugerida.
2. Editar nota.

Nenhuma outra ação pertence ao escopo do MVP (Seção 3).

## 2. Ações docentes disponíveis

- **Validar nota sugerida** — o professor concorda com a nota sugerida pelo Mentor e ela se torna a nota final sem alteração.
- **Editar nota** — o professor altera o valor sugerido; o novo valor se torna a nota final (Seção 7).

Estas são as duas únicas ações principais da etapa de avaliação assistida (Seção 8).

## 3. Fora do escopo do MVP

Removidas da seção de avaliação assistida:

- desconsiderar sugestão;
- solicitar nova tentativa;
- registrar observação pedagógica como ação principal;
- qualquer outra ação além de validar ou editar.

Isso não impede que o professor deixe comentários em outras partes da plataforma — apenas remove essas ações do fluxo principal de avaliação assistida do MVP.

## 4. Fluxo oficial

1. O Mentor gera a síntese pedagógica (`mentor-iah-fluxo-pedagogico-mvp.md`, Seção 10).
2. O Mentor apresenta uma nota sugerida com justificativa.
3. O professor escolhe uma das duas ações da Seção 2: validar nota sugerida ou editar nota.
4. A nota escolhida pelo professor torna-se a nota final.
5. Somente após essa decisão a nota pode ser exibida ao estudante (Seção 9).

## 5. Status da nota no MVP

- **Aguardando validação docente** — síntese e nota sugerida geradas, professor ainda não decidiu.
- **Nota sugerida** — valor proposto pelo Mentor, antes de qualquer decisão do professor.
- **Nota validada** — professor confirmou a nota sugerida sem alteração.
- **Nota editada** — professor alterou o valor sugerido.

Nenhum outro status pertence ao MVP.

## 6. Auditoria

Todo ciclo de avaliação assistida registra:

- nota sugerida;
- nota final;
- ação do professor: validada ou editada;
- professor responsável;
- data e hora;
- justificativa da edição, quando houver;
- versão da rubrica;
- versão do Mentor.

## 7. Regra para edição

Quando o professor edita a nota:

- a alteração da nota é permitida;
- uma justificativa breve é permitida;
- a justificativa é opcional no MVP;
- a diferença entre nota sugerida e nota final é sempre registrada (Seção 6).

## 8. Interface conceitual

A síntese apresenta exatamente dois botões principais:

```
[ Validar nota sugerida ]

[ Editar nota ]
```

Nenhum outro botão pertence a esta etapa.

## 9. Salvaguardas

- O Mentor não publica nota automaticamente.
- O professor continua sendo a autoridade final (`mentor-iah-constituicao-pedagogica.md`, Seção 11).
- O estudante não visualiza a nota sugerida antes da validação docente.
- A edição não apaga a nota originalmente sugerida — ambas permanecem registradas (Seção 6).
- Todo ajuste permanece auditável (Seção 6).

---

Este documento define a persistência da síntese e a avaliação assistida do MVP do MentorIAH. Nenhuma tela, dado ou fluxo técnico foi implementado por este documento — ele define o que deve acontecer, não como.
