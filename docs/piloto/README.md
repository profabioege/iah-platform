# Piloto real — Colégio Beryon, 1ª série A

Preparação do primeiro piloto com alunos reais (D-056). Branch `pilot/beryon-1a-2026`. **Nada publicado, enviado ou implantado; nenhum dado real usado.**

| Documento | Conteúdo |
|---|---|
| [01-candidata-e-ambiente.md](01-candidata-e-ambiente.md) | Candidata, ambiente hospedado recomendado, autenticação/persistência/segregação/recuperação |
| [02-importacao-e-acesso.md](02-importacao-e-acesso.md) | CSV `nome,email_institucional,turma`, validação prévia, importação, modelo de acesso, texto do Classroom |
| [03-missao-e-roteiro.md](03-missao-e-roteiro.md) | Missão 01, critérios dos dois eixos, ferramentas e alternativa, roteiro de 45 min, continuidade |
| [04-ensaio.md](04-ensaio.md) | Critérios, resultados locais, verificações, passo a passo e tabela do ensaio hospedado |
| [05-registro-da-aula.md](05-registro-da-aula.md) | Ficha da aula, ocorrências (ausência × falha técnica), avaliação breve |
| [06-relatorio-mantenedora-modelo.md](06-relatorio-mantenedora-modelo.md) | Relatório agregado para a mantenedora |
| [07-tratamento-de-dados.md](07-tratamento-de-dados.md) | O que é coletado e as perguntas para a escola |
| `modelos/` | CSV e configuração com dados **sintéticos** (inclui o kit do ensaio) |

Scripts (em `app/scripts/`, wrappers CMD em `app/scripts/windows/piloto-*.cmd`): `pilot-import-turma.mjs`, `pilot-credential-reset.mjs`, `pilot-ensaio-1a.mjs`, `pilot-backup.mjs`, `pilot-restore.mjs`, `pilot-metricas-aula.mjs`.

## Ordem de execução
1. Escola responde `07-tratamento-de-dados.md` e envia a lista autorizada, o domínio institucional e os e-mails do professor e do gestor.
2. Criar projeto Supabase e projeto Vercel do piloto (autorização necessária).
3. Ensaio hospedado com contas sintéticas — três rodadas aprovadas (`04-ensaio.md`).
4. Conferência da TI na sala (anexo B do roteiro).
5. Validação prévia da lista real → correções com a escola → importação.
6. Desativar contas sintéticas, cópia de segurança, atribuir a missão, aviso no Classroom.
7. Aula → indicadores → relatório.
