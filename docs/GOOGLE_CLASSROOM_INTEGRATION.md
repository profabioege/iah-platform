# Integração Google Classroom — IAH Educacional

Camada de integração com o Google Classroom: como o IAH lê turmas/alunos/professores/atividades do Google e os traz para o modelo interno. Complementa [IMPORT_ARCHITECTURE.md](IMPORT_ARCHITECTURE.md) (contrato genérico de importação), [PERSISTENCE.md](PERSISTENCE.md) (onde os dados importados são gravados) e [GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md) (credenciais/OAuth). Decisão registrada em `DECISIONS.md` D-024.

## Estado honesto desta fase

**Não há OAuth nem chamada real à API do Google.** Esta Sprint criou toda a arquitetura plugável; a camada de dados (`repositories/`) é um stub que lança erro sem credenciais. Enquanto isso, um `mockClassroomService` fornece dados **simulados e sempre rotulados** (nomes de escola/turma/aluno fictícios, nenhuma instituição real). O Import Wizard percorre o fluxo completo sobre esses dados e declara explicitamente, no passo final, que **nada foi gravado**.

Sobre o piloto no **Colégio Beryon**: esta Sprint entrega a infraestrutura para importar turmas reais, não a importação real em si. Deliberadamente **não criamos seeds com o nome "Beryon" nem alunos fictícios atribuídos a ele** — fabricar registros de uma instituição real seria diferente de uma escola de demonstração declaradamente fictícia (princípio D-015). A prontidão real para o Beryon depende dos passos em "Expansão futura".

## Arquitetura

```
app/src/modules/integrations/google-classroom/
├── types/         ← GoogleClassroom, GoogleCourse, GoogleStudent, GoogleTeacher, GoogleAssignment
├── dto/           ← forma CRUA das respostas da Classroom API
├── mappers/       ← DTO → entidade Google → tipos genéricos de importação
├── contracts/     ← ClassroomService (porta) + GoogleClassroomRepository (dados)
├── repositories/  ← acesso à Classroom API (STUB até haver OAuth)
├── services/      ← ClassroomService real (orquestra repo+mappers) + adapter p/ ImportProvider
├── mock/          ← mockClassroomService (dados simulados, rotulados)
└── index.ts       ← getClassroomService(): real quando configurado, simulado caso contrário
```

Princípio central: **nada fora deste módulo conhece os tipos Google.** A fronteira são os `mappers/`, que traduzem para o contrato genérico `ImportProvider` (`IMPORT_ARCHITECTURE.md`). Trocar Google por Microsoft/Moodle = escrever outro módulo equivalente, sem tocar em `modules/platform` nem em nenhuma tela.

### Camadas (o mesmo padrão dos outros módulos)

- **DTO ≠ entidade**: se o Google mudar o formato da API, só `dto/` e `mappers/` mudam.
- **ClassroomService real x mock**: ambos cumprem o mesmo contrato; `getClassroomService()` escolhe. O real **já está pronto** — o que falta é a camada de baixo (`repositories/`) deixar de ser stub, não o serviço.
- **`isSimulated`**: o contrato expõe essa flag; a UI é obrigada a rotular quando `true` (o Import Wizard mostra o aviso amarelo).

## Fluxo de sincronização

`ClassroomSyncService` (em `modules/platform`, genérico — não conhece Google):

```
selecionar turma → buscar alunos → comparar com o banco (por e-mail) →
criar inexistentes → atualizar existentes → registrar sincronização
```

Não duplica o `ImportService`: **compõe-o**. O ImportService resolve candidatos + reconciliação + gravação; o SyncService acrescenta o que é próprio de sincronizar — repetir sobre uma turma já importada e gravar o resultado em `ClassroomSyncState`. Falha de origem externa nunca some: fica registrada com `status: "failed"` e a mensagem do erro (degradação graciosa, D-019).

### Modelo de sincronização (`ClassroomSyncState`)

Cada turma sincronizada tem um registro com: data da última sincronização, quantidade de alunos, quantidade de atividades, status (`never_synced` | `synced` | `out_of_date` | `failed`) e a última mensagem de erro. Vive **ao lado** da Turma — uma turma de cadastro manual simplesmente não tem esse registro (o Painel mostra "Cadastro manual"). Schema: `app/db/migrations/0002_classroom_sync_state.sql`.

## Importação (Import Wizard)

Rota `/professor/importar`, 6 passos: **Instituição → Conectar Google → Turmas → Alunos → Confirmação → Resumo**. Nesta fase é estrutura + interface sobre dados simulados; a confirmação não grava (sem OAuth, sem banco). O passo Alunos mostra a reconciliação por e-mail que a importação real faria; o Resumo é honesto sobre nada ter sido persistido.

## Painel do Professor — seção Turmas

Nova seção lista as turmas da instituição lidas do módulo `platform` (hoje via seeds), cada uma com nome, ano letivo, nº de alunos, status de sincronização e última atualização, além do botão **Visualizar** (aponta para o acompanhamento da turma, na mesma página). Turmas sem sincronização externa aparecem como "Cadastro manual" — nunca um status inventado.

## Estrutura preparada (NÃO implementada): entrega de Missão

Contratos em `modules/platform/domain/mission-delivery.ts`, só arquitetura:

```
Missão → selecionar turma → publicar (MissionAssignment) →
receber entregas → Avaliação Assistida
```

- **`MissionAssignment`** é a "Atividade" de `DOMAIN_MODEL.md`: fixa `(missionId, version)` na publicação (P2 — editar a Missão depois não corrompe o histórico), com espelho opcional no `courseWork` do Google.
- **`AssistedEvaluationService`** devolve sugestões sempre rotuladas como apoio; `requiresTeacherReview: true` é invariante — a IA nunca dá nota nem veredito automático (professor no centro, `VISION.md`).

## Expansão futura (o que falta para o piloto real)

1. Projeto Google Cloud + OAuth (escopos `classroom.courses.readonly`, `classroom.rosters.readonly`) — passo a passo em `GOOGLE_WORKSPACE.md`.
2. Implementar `google-classroom-repository.ts` (hoje stub) com as chamadas HTTP reais — o `ClassroomService` e os mappers não mudam.
3. Banco de dados conectado (`PERSISTENCE.md`): sem ele, importar não persiste. Implementar `classroomSyncStates` e os demais repositórios de banco (hoje stubs).
4. Autenticação real: amarrar a importação a uma Instituição/usuário logado (hoje `INSTITUTION_ID` é fixo).
5. Só então: implementar entrega de Missão e Avaliação Assistida sobre os contratos já definidos.
