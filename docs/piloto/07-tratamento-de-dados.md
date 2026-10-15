# Piloto 1ª série A — Tratamento de dados (para confirmar com a escola)

Este documento não é parecer jurídico. Ele lista o que a plataforma coleta e as decisões que cabem à escola (controladora) e à IAH (operadora), para validação pelo encarregado de dados da escola ou pela assessoria jurídica **antes** da importação da lista real.

## 1. O que a plataforma coleta no piloto

| Dado | Por quê | Onde fica |
|---|---|---|
| Nome, e-mail institucional, turma | Identificar o aluno na turma e no acesso | Banco do piloto (Supabase, região São Paulo) |
| Hash da senha (scrypt) e versão da credencial | Autenticação individual | Banco do piloto |
| Tentativas de login (e-mail, **hash** da origem, sucesso/falha, horário) | Limitador de tentativas e indicador "acessos bem-sucedidos" | Banco do piloto |
| Produção, registro de uso da IA, reflexão, datas de início e entrega | Atividade pedagógica e acompanhamento do professor | Banco do piloto |
| Avaliação nos dois eixos e devolutiva do professor | Retorno pedagógico | Banco do piloto |
| Trilha administrativa (quem importou, quem redefiniu senha, quando — **nunca** senha) | Prestação de contas | Banco do piloto |
| Registros técnicos de requisição (endereço, horário, status) | Operação do serviço | Provedor de hospedagem da aplicação (Vercel) |

**Não coletamos**: CPF, data de nascimento, telefone, endereço, foto, dados de responsáveis, dados de saúde. O importador recusa colunas além de `nome, email_institucional, turma`.

**Nenhum dado vai para provedor de IA**: a plataforma do piloto não chama serviço de IA. O aluno usa uma ferramenta de IA fora da plataforma (a aprovada pela escola), com a orientação de **não escrever dados pessoais** no pedido.

## 2. Perguntas para a escola (preencher antes de importar)

| # | Tema | Pergunta | Resposta da escola |
|---|---|---|---|
| 1 | Finalidade | A finalidade é: realizar uma aula de IA & Humanidades na plataforma e avaliar, com dados agregados, a continuidade do uso. Confere? | |
| 2 | Papéis | A escola atua como controladora e a IAH Educacional como operadora, tratando dados só sob instrução da escola? Há instrumento (contrato/termo de piloto) que registre isso? | |
| 3 | Base legal | Qual base legal a escola adota para este tratamento de dados de adolescentes (LGPD art. 7º e art. 14, melhor interesse)? | |
| 4 | Comunicação | Como alunos e responsáveis serão informados (comunicado, agenda, Classroom)? Há modelo da escola? | |
| 5 | Retenção | Proposta IAH: manter os dados até o fim do ano letivo de 2026 (ou fim do piloto) e, em até 30 dias, devolver à escola um export e **apagar** banco e cópias. A escola aprova outro prazo? | |
| 6 | Pedidos de titulares | Quem recebe pedidos de acesso, correção ou exclusão (canal da escola)? Prazo de resposta da IAH à escola: até 5 dias úteis. | |
| 7 | Uso comercial | A IAH pode usar no relatório comercial **somente resultados agregados e anônimos** (contagens, tempos, médias da avaliação breve), sem nome, e-mail ou trecho de produção identificável? | |
| 8 | Ferramenta de IA | Qual ferramenta de IA os alunos podem usar com a conta institucional? Ou a aula usa o Plano B (demonstração projetada pelo professor)? | |
| 9 | Operador | Quem da IAH pode acessar os dados (nome e função) e de qual equipamento? | |
| 10 | Incidente | A quem da escola comunicar um incidente de segurança, e em quanto tempo? | |

## 3. Compromissos operacionais da IAH no piloto

- Lista real, configuração e credenciais **fora do Git**, em pasta de acesso restrito do operador; arquivo de credenciais apagado após a entrega dos papéis.
- Relatórios de validação e de indicadores citam linha/e-mail mascarado ou só agregados; nenhum nome em log, chat ou material demonstrativo.
- Projeto de banco **exclusivo** do piloto, separado de demonstração, homologação e produção; RLS ativa; acesso administrativo só pelo operador.
- Cópia de segurança lógica antes e depois da aula (contém dados pessoais e hashes: guardada fora do repositório, apagada no fim da retenção).
- Contas sintéticas de ensaio: ficam numa instituição sintética separada e são **desativadas** antes da aula real.
- Dados demonstrativos e comerciais continuam 100% fictícios.
