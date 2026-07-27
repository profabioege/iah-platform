# Protocolo de Autoria e Integridade do Mentor IAH

Documento de produto — define como o IAH reduzirá o uso indevido de Inteligência Artificial nos processos de aprendizagem **sem** depender de bloqueio absoluto de captura de tela ou de detectores automáticos pouco confiáveis. Não é uma especificação técnica: não define schema, tela, rota ou banco. Nenhum código, componente, tela ou dado foi alterado para produzir este documento.

## Princípio central

> O IAH não deve tentar provar automaticamente que um estudante usou IA.
> O sistema deve verificar se o estudante compreendeu, tomou decisões, auditou informações, preservou autoria e consegue defender sua produção.

Este princípio governa todas as seções abaixo. Qualquer mecanismo, sinal ou relatório que o contrarie — isto é, que tente **provar uso de IA** em vez de **verificar processo de aprendizagem** — está fora do escopo permitido pelo protocolo.

---

## 1. Problema

Estudantes têm acesso trivial a ferramentas de IA generativa capazes de produzir, em segundos, respostas, textos e soluções que imitam produção humana. Isso cria um risco real para o objetivo pedagógico do IAH: se a produção entregue não reflete compreensão, decisão e autoria do estudante, a Missão deixa de cumprir sua função (pensamento crítico, autoria, uso responsável de IA — `MISSION.md`, `03_BRAND_GUIDELINES.md`).

A resposta ingênua a esse problema — impedir tecnicamente a cópia ou detectar automaticamente "texto de IA" — falha por dois motivos:

1. **Não é tecnicamente robusta** (Seções 2 e 3): pode ser contornada com esforço mínimo e produz falsos positivos/negativos em volume relevante.
2. **É pedagogicamente errada**: trata o estudante como suspeito por padrão, desloca o objetivo da aula de "aprender" para "não ser pego", e substitui o julgamento do professor por um veredito automático que ninguém consegue auditar.

O protocolo deste documento propõe o caminho inverso: **em vez de vigiar o ato de usar IA, o IAH observa e coleta evidências do processo de aprendizagem** — e é o professor, nunca o sistema, quem julga.

## 2. Limites técnicos do bloqueio de capturas

Bloquear captura de tela, impedir copiar/colar ou detectar troca de janela são controles **triviais de contornar** (segundo dispositivo, fotografia da tela, extensão de navegador, gravação externa, ou simplesmente digitar de memória o que foi lido em outra aba) e **caros de manter** (cada navegador/SO exige uma implementação diferente, quebram com atualizações, e boa parte depende de permissões que o próprio usuário controla).

Além do custo técnico, esses controles têm efeitos colaterais que o IAH rejeita:

- **Falso senso de segurança**: um bloqueio "furado" é pior do que nenhum, porque o professor passa a confiar em uma barreira que não existe.
- **Atrito para uso legítimo**: um estudante consultando material de apoio, um segundo monitor ou um leitor de tela (acessibilidade) é impactado pelo mesmo controle que tentaria barrar o uso indevido.
- **Sinal errado**: a mensagem implícita ao estudante é "você é suspeito", não "sua autoria importa".

**Conclusão do protocolo:** o IAH não implementa, e não deve implementar, bloqueio de captura de tela, de copiar/colar ou de troca de janela como mecanismo de integridade. Perda de foco da janela pode existir como *sinal técnico não conclusivo* (Seção 6), nunca como bloqueio.

## 3. Limites dos detectores de texto por IA

Detectores automáticos de "texto gerado por IA" (comerciais ou open-source) têm taxas de erro que os tornam impróprios como prova:

- **Falsos positivos** atingem desproporcionalmente estudantes com escrita muito estruturada, não-nativos do idioma, neurodivergentes, ou que simplesmente escrevem de forma mais formal — exatamente o tipo de acusação injusta que o IAH existe para evitar (D-016 e o compromisso de nunca tratar perfil de turma como diagnóstico, já vigente em `docs/DOMAIN_MODEL.md` e replicado no Planejador Conversacional).
- **Falsos negativos** são triviais de produzir: reescrever a saída da IA com um segundo prompt ("reescreva isso com erros e informalidade") derrota a maioria dos detectores.
- **Nenhum desses detectores expõe o raciocínio da decisão** — devolvem um score ou percentual sem explicação auditável, o que os torna incompatíveis com qualquer processo que possa gerar consequência real para o estudante.
- **A tecnologia geradora evolui mais rápido que a detectora** — qualquer confiança depositada num detector hoje tem validade decrescente.

**Conclusão do protocolo:** o IAH não adota, e não deve adotar, detectores automáticos de "texto de IA" como fonte de veredito. Um score de detector, se algum dia existir tecnicamente, só poderia entrar como *sinal técnico não conclusivo* (Seção 6) — nunca como classificação, nota ou acusação.

## 4. Princípio de autoria do IAH

Autoria, para o IAH, não é "não ter usado IA" — é **ter permanecido o autor da decisão**. Um estudante que usa IA para gerar um rascunho, mas o audita, corrige, contextualiza e consegue explicar por que manteve ou descartou cada parte, exerceu autoria. Um estudante que copia uma resposta pronta e não consegue explicá-la, não exerceu autoria — mesmo que nunca tenha "usado IA" (poderia ter copiado de um colega).

Por isso, o protocolo desloca a pergunta de **"esta produção foi gerada por IA?"** para **"este estudante consegue defender esta produção como sua?"**. A segunda pergunta é verificável de forma justa (Seções 5 e 7); a primeira, não (Seções 2 e 3).

Três consequências diretas:

- O uso de IA declarado e auditado **não é falha de integridade** — é o comportamento que o IAH ensina a ter (`03_BRAND_GUIDELINES.md`: "uso responsável da Inteligência Artificial").
- A ausência de qualquer traço de IA **não é, por si, prova de integridade** — um estudante pode entregar um trabalho 100% "manual" e ainda assim não ter compreendido nada (copiado de um colega, de um material antigo, etc.).
- O que o sistema mede é **processo**, não **origem do texto**.

## 5. Evidências do processo de aprendizagem

Em vez de vigiar o ato de escrever, o IAH coleta e preserva evidências que já nascem do próprio fluxo da Missão (Dossiê, Desafio, Diário do Auditor — `AUTHORING_MODEL.md`, `MISSION.md`) e da eventual Microdefesa (Seção 7). Evidências não são veredito — são o material que compõe o Relatório para o Professor (Seção 9) e que o próprio estudante pode revisitar.

Registradas como evidência:

1. **Hipótese inicial** — o que o estudante presumia antes de investigar.
2. **Fontes** — o que foi consultado (Dossiê, material didático, pesquisa externa declarada).
3. **Prompts declarados** — quando IA foi usada, o que foi perguntado a ela (autodeclaração do estudante, nunca inferida por vigilância).
4. **Resposta recebida da IA** — o que a ferramenta devolveu, quando houve uso declarado.
5. **Revisão realizada** — o que o estudante mudou, cortou ou confirmou a partir da resposta recebida.
6. **Justificativa** — por que manteve, descartou ou ajustou cada parte.
7. **Reflexão humanística** — a entrada do Diário do Auditor (sempre registro, nunca prova — `AUTHORING_MODEL.md`).
8. **Produto final** — a entrega em si (Relatório de Auditoria, Produção do Aluno).
9. **Defesa adaptativa** — a resposta à Microdefesa (Seção 7), quando acionada.

Nenhuma evidência isolada é conclusiva. O valor está no conjunto: um processo com hipótese, fontes, revisão e justificativa coerentes entre si é evidência de compreensão, independentemente de ter havido uso de IA em algum passo.

## 6. Sinais técnicos de atenção

Sinais técnicos são observações automáticas que **podem** indicar necessidade de olhar mais de perto — nunca uma conclusão. Todo sinal técnico é, por definição, **não conclusivo** (Regra Obrigatória, abaixo).

Sinais técnicos de atenção reconhecidos pelo protocolo:

- Colagem extensa de texto em um único evento.
- Tempo de produção incompatível com a extensão/complexidade da entrega (rápido demais ou, inversamente, ausente por longos períodos e depois preenchido de uma vez).
- Mudança abrupta de estilo de escrita dentro da mesma produção.
- Respostas muito semelhantes entre estudantes diferentes.
- Ausência de etapas intermediárias (hipótese, rascunho, revisão) num fluxo que normalmente as produz.
- Perda frequente de foco da janela durante a produção.

Um sinal técnico, isoladamente ou em conjunto, **nunca** gera classificação, nota ou acusação (ver Regra Obrigatória). Ele pode, no máximo, ser um dos fatores que levam o processo a ser marcado como **necessita verificação docente** (Seção 8) — sempre em conjunto com a ausência ou fragilidade das evidências da Seção 5, nunca sozinho.

## 7. Microdefesa adaptativa

A Microdefesa é o mecanismo ativo do protocolo: em vez de vigiar, o IAH **pergunta**. Ela é acionada quando o processo está incompleto ou quando sinais técnicos (Seção 6) sugerem atenção — nunca como rotina universal obrigatória, para não transformar toda entrega em interrogatório.

A Microdefesa deve:

1. **Gerar uma pergunta baseada na produção do próprio estudante** — nunca uma pergunta genérica de banco de questões; ela cita algo que o estudante escreveu ou decidiu.
2. **Pedir explicação com palavras próprias** — nunca aceitar reformulação copiada da produção original.
3. **Solicitar evidência ou justificativa** — "por que você concluiu isso?", "de onde veio esse dado?".
4. **Verificar aplicação do conceito em um novo contexto** — a prova real de compreensão é conseguir usar a ideia em uma situação diferente da original, não repetir a original.
5. **Registrar a resposta como evidência** (Seção 5, item 9) — a resposta entra no processo do estudante, não é descartada.
6. **Encaminhar ao professor apenas quando houver inconsistência relevante** — uma resposta fraca não gera punição automática; gera encaminhamento para julgamento humano (Seção 9), com todas as evidências anexadas.

A Microdefesa é adaptativa: sua dificuldade e foco variam conforme a produção e os sinais observados, mas seu objetivo é sempre o mesmo — dar ao estudante a chance de demonstrar compreensão, não flagrá-lo.

## 8. Uso permitido, condicionado e proibido de IA

| Categoria | Descrição | Exemplo |
|---|---|---|
| **Permitido** | Uso declarado, auditado e defensável. O estudante sabe o que pediu, revisou o que recebeu e consegue explicar o resultado. | Pedir à IA uma explicação inicial de um conceito difícil, depois reescrever com exemplos próprios e citar o uso na justificativa. |
| **Condicionado** | Uso que exige registro e defesa adicional antes de ser aceito como parte do processo. Não é proibido, mas não é aceito "no escuro". | Usar IA para gerar um primeiro rascunho estrutural de um texto longo — aceitável se o prompt for declarado e a revisão/justificativa (Seção 5) demonstrarem apropriação real. |
| **Proibido** | Entregar como próprio um resultado de IA sem qualquer registro, revisão ou capacidade de defesa — independentemente de "ter sido pego" por um sinal técnico. | Colar a resposta da IA diretamente na entrega, sem prompt declarado, sem revisão e sem conseguir responder à Microdefesa. |

A fronteira entre as três categorias nunca é "usou ou não usou IA" — é **declarou, revisou e consegue defender**, ou não.

## 9. Relatório para o professor

O Relatório para o Professor é o produto final do protocolo: um dossiê organizado das evidências (Seção 5) e dos sinais técnicos observados (Seção 6), com uma indicação de status — nunca um veredito de culpa.

Três status possíveis, e apenas estes três:

- **Processo consistente** — hipótese, fontes, revisão, justificativa e (quando acionada) defesa adaptativa formam um conjunto coerente. Nenhuma ação adicional é sugerida.
- **Processo incompleto** — faltam evidências suficientes para avaliar o processo (ex.: sem hipótese registrada, sem justificativa), mas não há indicação de má-fé. O professor decide se pede complementação.
- **Necessita verificação docente** — sinais técnicos relevantes (Seção 6) coexistem com evidências fracas ou ausentes, ou a Microdefesa revelou inconsistência relevante (Seção 7, item 6). O professor recebe o dossiê completo para julgar — o IAH não julga por ele.

**Nunca utilizar, em nenhuma tela, relatório, log ou comunicação:**

- "fraude detectada";
- "texto de IA confirmado";
- "aluno usou IA";
- percentual de culpa ou score de suspeita.

O Relatório para o Professor descreve **processo**, não **veredito**. A decisão pedagógica e disciplinar é sempre humana.

## 10. Salvaguardas contra falsas acusações

Porque nenhum sinal técnico é confiável isoladamente (Seções 2, 3 e 6), o protocolo exige salvaguardas explícitas:

- **Regra obrigatória:** nenhum sinal técnico ou detector automático pode gerar punição, nota automática ou acusação sem análise humana e evidências adicionais. Um sinal técnico, sozinho, nunca ultrapassa o status "necessita verificação docente" — e mesmo esse status é um convite à revisão, não uma acusação.
- **Ônus da evidência, não da suspeita:** o sistema não parte do princípio de que o estudante é culpado e pede que se prove inocente; ele reúne o que já existe do processo e, quando insuficiente, oferece ao estudante a chance de complementar (Microdefesa) antes de qualquer encaminhamento.
- **Direito de resposta preservado:** toda vez que o processo é marcado como "necessita verificação docente", o dossiê enviado ao professor inclui todas as evidências favoráveis ao estudante (Seção 5), não só os sinais de atenção.
- **Perfis e contextos não viram suspeita:** estilo de escrita atípico, uso de leitor de tela, segundo monitor, dificuldade de leitura/interpretação ou qualquer característica de perfil de turma (`CLASS_PROFILE_TAGS`, já usado no Planejador Conversacional) nunca é, por si, um sinal técnico de atenção.
- **Auditabilidade:** todo status "necessita verificação docente" deve ser rastreável às evidências e sinais específicos que o motivaram — nunca uma caixa-preta.
- **Reversibilidade:** um "processo incompleto" ou "necessita verificação docente" nunca é permanente por padrão; vira "processo consistente" assim que a lacuna de evidência for preenchida (nova defesa, nova conversa com o professor).

---

Este protocolo é a base de princípios para qualquer implementação futura do Mentor IAH relacionada a integridade acadêmica. Nenhuma tela, dado ou fluxo descrito aqui foi implementado por este documento — ele define o que deve (e o que não deve) ser construído, não como.
