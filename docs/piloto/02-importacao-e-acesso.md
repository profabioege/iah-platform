# Piloto 1ª série A — Importação da turma e modelo de acesso

## 1. Modelo de acesso escolhido

**E-mail institucional + senha provisória individual, com troca obrigatória no primeiro acesso.** É o mecanismo já implementado e testado (`tests/pilot/pilot-provisioning.test.mjs`, `tests/e2e/credenciais.test.mjs`).

Por que não "Entrar com Google" nesta aula:
- o login Google existente (D-025) **provisiona todo usuário como professor** (`ensureTeacherProvisioned`) — não serve para alunos e não confere a lista nominal da turma;
- exigiria projeto Google Cloud e liberação da TI da escola, que não existem hoje.

Consequência obrigatória: **não configurar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no ambiente do piloto.**

Como o modelo atende às exigências:
| Exigência | Como é atendida |
|---|---|
| Só a lista nominal autorizada | Só existe conta para quem foi importado; não há cadastro aberto, nem aceitação por domínio. |
| Domínio ou e-mail digitado não bastam | Entrar exige a senha individual entregue em papel ao próprio aluno; depois, a senha que só ele conhece. |
| Sem conta compartilhada, senha comum ou modo demo | Cada conta recebe senha aleatória diferente (testado: nenhuma se repete); `IAH_AUTH_MODE=supabase`; modo demo e ambiente de demonstração desligados. |
| Recuperação de acesso | Assistida: a escola pede, o operador gera nova senha provisória individual; as sessões antigas são encerradas (`credentials_version`). |
| Computador compartilhado | "Sair" encerra a sessão; o próximo aluno entra com a própria conta e vê só o próprio trabalho (verificado no ensaio). |
| Limitador de tentativas | 8 falhas por e-mail / 120 por origem em 15 min — a turma inteira no mesmo IP não é bloqueada por quem acerta a senha. |

## 2. Importação da 1ª série A

Formato do CSV (modelo com dados sintéticos: `modelos/alunos-1a-modelo.csv`):

```
nome,email_institucional,turma
Aluno Sintético Um,aluno.sintetico.um@escola.example,1ª série A
```

- Só essas três colunas. Coluna a mais (CPF, telefone, data de nascimento…) é **recusada** — não coletamos o que não é necessário.
- Vírgula ou ponto e vírgula; com ou sem BOM (Excel "CSV UTF-8").
- A configuração da turma (instituição, ano, turma, professor, gestor, **total esperado = total oficial a confirmar (31 registros recebidos × 32 planejados)** e **domínio institucional**) fica num JSON fora do repositório — modelo em `modelos/piloto-1a-config.modelo.json`.

### Validação prévia (só lê; obrigatória antes de importar)

```
cd app\scripts\windows
piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv --offline   (antes do ambiente existir)
piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv             (com o banco do piloto)
```

O relatório mostra, citando **número da linha e e-mail mascarado** (nunca o nome):
- total no arquivo × total da lista institucional (total oficial a confirmar);
- quantos são da 1ª série A e quantos de outra turma (outra turma **bloqueia**: retire a linha);
- e-mails ausentes, inválidos, repetidos ou fora do domínio da escola (**bloqueiam**);
- domínios encontrados (para conferir o domínio institucional);
- homônimos (**aviso**: confirmar com a secretaria);
- contas que já existem: nesta turma (já vinculadas), sem matrícula (serão vinculadas), de **outra instituição** ou **outro papel** ou **desativadas** (**bloqueiam** — nunca são reaproveitadas em silêncio);
- contas a criar.

Resultado: `NÃO IMPORTAR` (há bloqueio) ou `apto para importar`. **Divergência de identificação nunca segue para a importação.**

### Importação

```
piloto-importar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv inst-beryon <total oficial> C:\piloto\credenciais-1a.csv fabio
```

- Só roda com zero bloqueios, com o id da instituição e o **total conferido** digitados.
- Recusa arquivos de entrada e saída dentro do repositório; não sobrescreve um arquivo de credenciais existente.
- **Repetível**: rodar de novo não cria conta, aluno nem matrícula duplicada (testado com 35 alunos, duas importações seguidas, e com aluno já cadastrado sob outro identificador).
- O identificador do aluno é derivado de instituição + e-mail (sem o e-mail em claro).
- As senhas provisórias vão **só** para o arquivo de credenciais (`perfil;nome;email;senha_inicial`), para imprimir e recortar. Depois da aula, apagar o arquivo.

## 3. Aviso para o Classroom (o professor publica manualmente)

Não depende de integração com a API do Classroom. **Não colocar senha no Classroom.**

> **Aula de IA & Humanidades — Missão 01: A Fábrica de Notícias**
> Na aula de [dia], [horário], vamos usar a plataforma IAH Educacional.
> Endereço: [https://ENDEREÇO-DO-PILOTO/entrar]
> Você vai receber na sala um papel com o seu acesso individual (seu e-mail institucional e uma senha provisória). No primeiro acesso a plataforma pede que você crie a sua senha — não compartilhe com ninguém e não publique aqui.
> Se esquecer a senha, fale com o professor: ele pede uma nova para você.
> No fim da aula, clique em **Sair** antes de deixar o computador.

## 4. Recuperação e troca de aluno

- **Recuperar acesso**: `piloto-recuperar-acesso.cmd <email-institucional> <operador> "pedido do professor em DD/MM"`. A senha provisória aparece só na janela do operador; o aluno troca no primeiro acesso.
- **"Esqueci minha senha"** (tela `/entrar`, modo real): leva a `/entrar/esqueci-senha`, que só orienta — alunos procuram o professor; professores e gestores acionam o responsável pela operação do piloto, que usa o comando acima. Não há recuperação automática nem envio de e-mail, e a tela avisa que ninguém pede a senha por mensagem.
- **Troca de aluno no mesmo computador**: aluno A clica em **Sair** → aluno B entra com a própria conta. Verificado no ensaio: depois de sair, a sessão anterior não acessa nada; B vê apenas o trabalho de B.

## 5. Variáveis de ambiente (operador)

Definidas **na janela do CMD**, nunca em arquivo dentro do repositório. `piloto-checar-ambiente.cmd` confere a presença sem mostrar valores:
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IAH_HOMOLOGATION_PROJECT_REF` (ref do projeto do piloto) e `IAH_PROTECTED_PROJECT_REFS` (refs que nunca podem ser alvo: produção, site, demonstração, homologação).
