# Piloto 1ª série A — Ensaios com contas sintéticas

## 1. Critérios (fixos; reprovação é registrada, não afrouxada)

Cenário: **35 alunos + professor + gestor** conectados; no máximo **25 alunos enviando ao mesmo tempo** (os demais enviam assim que uma vaga libera); **todos concluem** produção, registro de uso da IA e reflexão; o professor acompanha durante o envio e devolve 5 avaliações nos dois eixos.

| Critério | Limite |
|---|---|
| Erros (login, leitura, gravação, entrega) | 0 |
| Integridade (35 produções entregues, 35 reflexões, 35 registros de IA, sem duplicata, sem conteúdo trocado) | completa |
| p95 de login | ≤ 2000 ms |
| p95 de leitura da missão | ≤ 1000 ms |
| p95 de gravação (cada chamada, incluindo salvamento automático) | ≤ 1500 ms |
| p95 de leitura do professor | ≤ 1500 ms |

O limite de 25 é do **gerador** (simula a sala); a aplicação não tem fila. O relatório separa: pico de **alunos enviando**, pico de **requisições HTTP em voo**, **espera no gerador** e **tempo percebido** por aluno. O resultado **não** comprova capacidade para os 32 alunos da 1ª série A (escopo atual do piloto). O campo `alcance` do relatório deixa explícito quantos alunos sintéticos rodaram, a concorrência observada, a espera no gerador, o tempo completo de envio e se o salvamento automático por digitação foi verificado.

## 2. Ensaio local (executado nesta preparação)

`node --experimental-strip-types scripts/pilot-ensaio-1a.mjs --modo=local` — banco efêmero (PostgreSQL 16 + PostgREST 12.2.3), build de produção, servidor Next, gerador e banco **na mesma máquina de 2 CPUs**. Mede a aplicação, **não** a hospedagem.

Oito rodadas (r1–r3 antes do porte do contexto do aluno em paralelo; r4–r8 com a branch final). Em **todas**: 0 erros, integridade completa (35/35/35, sem duplicata nem troca), 9/9 verificações de segurança, pico de **25 alunos enviando** e **26 requisições HTTP em voo** no envio (36 com a digitação).

| Rodada | Digitação | p95 login | p95 leitura missão | p95 gravação (envio) | p95 salvamento automático | p95 professor | Espera no gerador p95 | Tempo percebido p95 | Resultado |
|---|---|---|---|---|---|---|---|---|---|
| r1 | — | 100 ms | 91 ms | 1316 ms | — | 871 ms | 7,5 s | 10,4 s | aprovado |
| r2 | — | 107 | 79 | 1339 | — | 1272 | 7,9 s | 11,4 s | aprovado |
| r3 | — | 95 | 73 | **1598** | — | 984 | 8,4 s | 11,8 s | **reprovado** (gravação) |
| r4 | — | 105 | 88 | 1457 | — | 1048 | 8,0 s | 11,0 s | aprovado |
| r5 | — | 105 | 82 | 1426 | — | 1163 | 8,1 s | 11,3 s | aprovado |
| r6 | — | 104 | 72 | 1063 | — | 978 | 8,2 s | 11,2 s | aprovado |
| r7 | 5 min | 104 | 74 | **1722** | 141 (1054 amostras) | 176 | 6,6 s | 9,7 s | **reprovado** (gravação)¹ |
| r8 | 5 min | 112 | 82 | **1861** | 122 (1052 amostras) | 167 | 6,7 s | 10,1 s | **reprovado** (gravação) |

¹ A r7 foi marcada "aprovada" pela primeira versão do script, que misturava os salvamentos automáticos (rápidos e numerosos) com o envio no mesmo p95 — isso diluía o pico. O script foi corrigido para julgar cada conjunto separadamente; pela regra corrigida a r7 é **reprovada**. A r8 repetiu o cenário com o script corrigido.

**Leitura:** a aplicação, sozinha numa máquina de 2 CPUs com o banco e o gerador, cumpre login, leitura e acompanhamento com folga; a **gravação no pico de 25 alunos enviando** fica no limite (p95 entre 1,06 s e 1,86 s; 3 de 8 rodadas acima de 1,5 s). A digitação contínua com salvamento automático (≈3,5 gravações/s por 5 min) é leve (p95 ≈ 0,13 s). O envio do ensaio é mais concentrado que o real (cada aluno faz 9 chamadas seguidas, sem pausa). **Nada disso mede a hospedagem**: no plano gratuito, a API do banco foi o gargalo em setembro.

## 3. Verificações funcionais e de segurança (todas com contas sintéticas)

| Verificação | Onde | Resultado |
|---|---|---|
| Acesso de aluno, professor e gestor; troca obrigatória da senha provisória | ensaio + `tests/e2e/credenciais.test.mjs` | ok |
| Professor atribui a Missão 01 à 1ª A; **não** alcança a turma sintética extra | ensaio + `tests/e2e/dois-eixos.test.mjs` | ok |
| Aluno não vê produção de colega; não consegue avaliar entrega de colega (conferido no banco) | ensaio + `tests/pilot/pilot-isolation.test.mjs` | ok |
| Bloqueio entre instituições (aluno, professor, troca de id na requisição) | `tests/e2e/isolamento.test.mjs`, `tests/pilot/pilot-isolation.test.mjs` | ok |
| Persistência em nova sessão (produção, entrega, devolutiva) | ensaio + `tests/pilot/pilot-lifecycle.test.mjs` | ok |
| Sair e trocar de aluno no mesmo navegador | ensaio | ok |
| Sem duplicata nem perda de entrega (repetição, clique duplo) | ensaio + `tests/learning-cycle-derived-state.test.mjs` | ok |
| Importação repetida sem duplicar; e-mail de outra instituição bloqueado | `tests/pilot/class-csv-import.test.mjs` | ok |
| Cópia → apagar → restaurar em banco vazio → login e trabalho de volta; restauração recusa banco com dados | `tests/pilot/backup-restore.test.mjs` | ok |
| Indicadores da aula sem dado identificável | `tests/pilot/metricas-aula.test.mjs` | ok |
| **Equipamento e rede da escola** | conferência da TI (anexo B do roteiro) | **pendente** |

Suítes nesta branch (15/10): unidade **480/480**, integração com banco real **92/92**, homologação por HTTP **64/64**, TypeScript e ESLint sem erros.

## 4. Ensaio hospedado — **NÃO EXECUTADO**

Bloqueios: não existe aplicação hospedada do piloto; o ambiente desta preparação não alcança `supabase.co` nem `vercel.app` (rede restrita) e a integração com a Vercel recusa o escopo da conta (403). O ensaio precisa ser rodado a partir de um computador com acesso à internet — não como servidor, só como gerador de carga.

### Passo a passo (depois de criados o projeto Supabase e o projeto Vercel do piloto — `01-candidata-e-ambiente.md`)

1. Na janela do CMD, defina as variáveis do projeto do piloto e confira com `piloto-checar-ambiente.cmd`.
2. Registrar a Missão 01 no banco:
   `node scripts\pilot-seed-mission.mjs --id=01-a-fabrica-de-noticias --number=1 "--title=A Fábrica de Notícias" "--module=Módulo 1 — O Auditor da Realidade" --execute --confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%`
3. Copiar `docs\piloto\modelos\ensaio\` para `C:\piloto\ensaio\` (a importação recusa arquivos de dentro do repositório) e importar as turmas **sintéticas**:
   `piloto-importar-turma.cmd C:\piloto\ensaio\ensaio-config-1a.json C:\piloto\ensaio\ensaio-1a-35-sinteticos.csv inst-ensaio-1a 35 C:\piloto\ensaio\cred-1a.csv ensaio`
   `piloto-importar-turma.cmd C:\piloto\ensaio\ensaio-config-extra.json C:\piloto\ensaio\ensaio-extra-sinteticos.csv inst-ensaio-1a 1 C:\piloto\ensaio\cred-extra.csv ensaio`
4. `set ENSAIO_SENHA_BASE=<texto de 10+ caracteres>` e rodar, de preferência **na rede da escola**:
   `piloto-ensaio-hospedado.cmd https://<endereço-do-piloto> C:\piloto\ensaio\cred-1a.csv C:\piloto\ensaio\cred-extra.csv C:\piloto\ensaio\resultado-1.json`
   (inclui 10 min de digitação com salvamento automático antes do envio).
5. Repetir o passo 4 mais duas vezes (resultado-2, resultado-3). Aprovação = as três dentro dos critérios.
6. Cópia de segurança do projeto (`piloto-copia-seguranca.cmd C:\piloto\ensaio\copia-ensaio.json`) — contém **só dados sintéticos** nesta fase; a restauração dela num banco isolado fecha o ensaio de recuperação no ambiente hospedado.
7. Desativar as contas sintéticas antes da aula real (SQL no painel do Supabase, projeto do piloto):
   `update users set status = 'inactive' where institution_id = 'inst-ensaio-1a';`

### Resultados hospedados
| Rodada | Data/rede | Erros | Integridade | p95 login | p95 leitura missão | p95 gravação | p95 professor | Pico alunos enviando | Pico HTTP em voo | Tempo percebido p95 | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | |
| 2 | | | | | | | | | | | |
| 3 | | | | | | | | | | | |

Referência anterior (setembro, 45 alunos, sem as correções portadas, app no Windows → banco hospedado): **reprovado** — login 2957 ms, leitura 5484 ms, gravação 3978 ms, professor 4909 ms; saturação da API do plano gratuito.

## 5. Salvamento automático — o que o aluno vê (Produção, Uso da IA e Reflexão)

Não há botão "salvar": o texto é enviado 800 ms depois da última edição, ao sair do campo e ao trocar de etapa
(`app/src/app/(platform)/missoes/[id]/mission-flow/use-student-work.ts`). O aviso abaixo do campo segue o estado
de cada campo, e só afirma gravação depois da confirmação do servidor:

| Estado | Aviso |
|---|---|
| Nada editado nesta visita | "Seu texto será salvo automaticamente enquanto você escreve." |
| Editado, aguardando envio | "Alterações ainda não salvas…" |
| Envio em andamento | "Salvando…" |
| Servidor confirmou a versão mais recente | "Salvo." |
| Falha | Erro em destaque; o texto continua no editor e é reenviado ao sair do campo ou na próxima edição |

Entregar, registrar a reflexão e reabrir não são otimistas: o botão mostra "Entregando…", "Registrando…" ou
"Reabrindo…" e a tela só muda ("Entregue em", "Registrada em") depois da confirmação do servidor. Entregar e
registrar primeiro enviam o rascunho pendente e só seguem se o servidor confirmou a versão mais recente do texto;
se algo falhar, aparece uma mensagem com orientação, o texto continua no editor e o mesmo botão tenta de novo.
O servidor recusa rascunho depois de entregue/registrado (teste de integração `pilot-lifecycle` nº 11).

As gravações passam por uma fila única (a mais nova chega por último ao banco). A resposta de um envio antigo não
marca "Salvo" nem substitui no editor um texto alterado depois dele. Antes desta correção (deploy
`dpl_5K7TWwDUFvTCG8RrHRTtPGj8BX85`), a Produção voltava ao texto inicial depois de gravar e a Reflexão não mostrava
indicador algum.

## 6. Controles do gerador (só do lado de quem gera o tráfego)

`app/scripts/pilot-ensaio-1a.mjs` usa `app/scripts/pilot-gerador-controles.mjs`. Nada disso roda na aplicação.

| Parâmetro | Efeito |
|---|---|
| `--peak-submitters=<n>` | alunos **enviando** ao mesmo tempo (fila de trabalhadores; padrão 25) |
| `--max-rps=<n>` | teto global de **requisições por segundo** de todo o gerador (balde de fichas); ausente = sem teto, e o relatório diz isso |
| `--rps-burst=<n>` | rajada do balde (padrão 1): até `n` saem juntas; em T s, no máximo `n + rps×T` |
| `--timeout-ms=<n>` | limite por requisição, inclusive a leitura do corpo (padrão 30000) |
| `--max-duration-s=<n>` | duração máxima da rodada (padrão: sem limite) |

As requisições **simultâneas** (em voo) não têm teto próprio: são medidas (`concorrencia.picoRequisicoesHttpEmVoo`).

**Parada automática de novos envios:** 429; 5xx fora dos controles negativos; tempo esgotado; erro de rede;
qualquer erro registrado no fluxo; Ctrl+C do operador (o segundo Ctrl+C sai sem relatório); duração máxima.
Recusas **esperadas** dos controles negativos (aluno avaliando colega, professor atribuindo a outra turma,
sessão encerrada) não param a rodada. Depois da parada nenhuma requisição nova começa; as que estavam em voo
terminam ou caem no timeout. Quem ainda esperava ficha do limitador sai da fila na hora da parada (sem esperar o
escoamento do balde) e conta como requisição não iniciada; a duração máxima é agendada pelo próprio controle.

**Relatório parcial** (`--out`): `interrompido: true`, motivo, fase, amostras até a parada, requisições em voo
na parada e ao final, requisições não iniciadas, integridade lida no banco quando houver acesso de leitura.
Rodada interrompida **nunca** é aprovada.

**Medições:** as latências julgadas pelos limites da seção 1 excluem só a espera imposta pelo próprio gerador
(limitador de req/s); essa espera e o tempo completo de cada operação aparecem em etapas próprias. A espera na
fila de alunos e o tempo percebido de envio por aluno continuam como antes.

**Validação:** `tests/pilot-gerador-controles.test.mjs` (unidade) e `tests/pilot-gerador-simulado.test.mjs`
(o gerador inteiro com `fetch` simulado em `https://gerador-simulado.invalid`, sem rede e sem banco). Validam o
gerador; não dizem nada sobre a capacidade da hospedagem.
