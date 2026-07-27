# Supabase Local — IAH Educacional

Guia da stack Supabase **genuinamente local** (Postgres + Auth + API + Studio rodando em containers Docker, na sua máquina) — isolada do projeto remoto já vinculado a este repositório. Existe para aplicar e validar migrations (a partir de `app/supabase/migrations/`) sem tocar em Preview, produção ou no banco compartilhado. Complementa `SUPABASE.md` (o projeto remoto) e `PERSISTENCE.md` (arquitetura de persistência) — não os substitui.

**Estado neste ambiente (checado em 2026-07-27):** Docker Desktop **não está instalado** nesta máquina (sem comando `docker` no PATH, sem instalação em `C:\Program Files\Docker`, sem serviço `com.docker.service`) e `app/supabase/config.toml` **não existe** — a stack local nunca foi inicializada aqui. Este documento descreve o procedimento para quando esse pré-requisito for satisfeito; nenhum comando de inicialização foi executado até agora.

## 1. Pré-requisitos

- **Docker Desktop instalado e em execução.** A CLI da Supabase sobe a stack local como containers Docker — sem Docker rodando, `supabase start` falha. Instalação: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (decisão e instalação são de quem opera a máquina — não automatizadas por este documento nem por nenhuma tarefa que o gerou).
- **Supabase CLI.** Ou instalada globalmente (`npm install -g supabase` ou `scoop`/`brew`, conforme o SO), ou disponível sob demanda via `npx supabase <comando>` — sem exigir instalação global.
- **Node.js e npm** — já usados pelo projeto (`app/package.json`); nenhum requisito adicional além do que já está configurado.
- Portas locais livres (padrão da CLI): `54321` (API), `54322` (Postgres), `54323` (Studio), `54324` (Inbucket/e-mail de teste), `54327` (Auth) — a CLI informa as portas reais ao subir; podem variar por versão/config.

## 2. Como iniciar a stack local

A partir da raiz do projeto:

```
cd app
supabase start
```

(ou `npx supabase start`, se a CLI não estiver instalada globalmente).

Na primeira execução, se `app/supabase/config.toml` ainda não existir, rode antes:

```
cd app
supabase init
```

`supabase init` cria `config.toml` e a estrutura padrão da CLI — **preserva** `app/supabase/migrations/` e qualquer seed já versionado, nunca sobrescreve o que já existe no diretório `supabase/`. Não é necessário (nem desejável) reconfigurar o vínculo remoto para isso.

`supabase start` baixa as imagens Docker necessárias (primeira vez, mais lento), sobe os containers e aplica automaticamente todas as migrations de `app/supabase/migrations/`, em ordem, contra o Postgres **local** recém-criado — incluindo `20260727000100_mentor_sessions.sql`, a próxima a validar (Seção 10).

## 3. Como encerrar

```
cd app
supabase stop
```

Para also remover completamente os dados locais (reset total, não apenas parar os containers):

```
supabase stop --no-backup
```

## 4. Como verificar o status

```
supabase status
```

Lista os serviços ativos (API, Postgres, Studio, Auth, Storage, Inbucket) e suas URLs/portas locais. **Também imprime chaves locais (`anon key`, `service_role key`) no terminal** — são chaves de desenvolvimento, únicas para esta stack local, sem qualquer relação com as chaves do projeto remoto, mas mesmo assim não devem ser coladas em capturas de tela, logs compartilhados ou commits (Seção 9).

Studio local (interface visual, equivalente ao painel do supabase.com, mas apontando para o Postgres local): normalmente `http://127.0.0.1:54323`, confirmar a porta exata na saída de `supabase status`.

## 5. Como aplicar migrations somente localmente

Com a stack local em execução, para (re)aplicar as migrations de `app/supabase/migrations/` contra o Postgres local:

```
cd app
supabase db reset
```

`db reset` recria o banco **local** do zero e reaplica todas as migrations em ordem — é o comando seguro e determinístico para validar uma migration nova localmente (equivalente a "começar do zero e ver se tudo aplica limpo"). Não afeta o projeto remoto: opera exclusivamente sobre o container Postgres local iniciado por `supabase start`.

Não usar `supabase db push` para isso — esse comando aplica contra o projeto **remoto vinculado** (Seção 8).

## 6. Como resetar o banco local

Mesmo comando da Seção 5:

```
supabase db reset
```

Reseta só o Postgres local (containers Docker desta stack) — não toca no projeto remoto, nunca. Útil para voltar a um estado limpo antes de repetir um teste.

## 7. Como distinguir ambiente local de remoto

| Sinal | Local | Remoto |
|---|---|---|
| URL da API | `http://127.0.0.1:<porta>` (`supabase status`) | `https://<project-ref>.supabase.co` |
| Onde roda | Containers Docker nesta máquina | Infraestrutura da Supabase, na nuvem |
| Comando que aplica migration | `supabase db reset` (local) | `supabase db push` ou SQL Editor do console (remoto) |
| Persistência | Enquanto os containers existirem nesta máquina | Permanente, compartilhada com quem mais tiver acesso ao projeto |
| Evidência de vínculo remoto neste repo | — | `app/supabase/.temp/linked-project.json`, `project-ref`, `pooler-url` (não abrir/exibir o conteúdo — a própria existência já basta como sinal) |
| Variáveis de ambiente da aplicação | Apontar a app local para a stack local exige sobrescrever `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` para os valores locais — nunca editar isso sem entender o impacto (Seção 9) | `app/.env.local` (hoje aponta para o projeto remoto, conforme `SUPABASE.md`) |

Regra prática: se a URL começa com `127.0.0.1` ou `localhost`, é local. Se termina em `.supabase.co`, é remoto — pare e confirme antes de qualquer comando destrutivo.

## 8. Comandos proibidos sem autorização

Os comandos abaixo agem sobre o projeto **remoto** (ou o publicam) e nunca devem ser executados a partir de uma tarefa de validação local, sem pedido explícito e consciente de quem opera o projeto:

- `supabase link` — (re)vincula o repositório a um projeto remoto.
- `supabase db push` — aplica migrations pendentes contra o projeto remoto vinculado.
- Qualquer aplicação de SQL pelo **SQL Editor** do console web do Supabase (supabase.com) — é, por definição, o projeto remoto.
- `vercel deploy`, merge para a branch de produção, ou qualquer outro caminho de deploy em **Preview ou produção**.

## 9. Cuidados com segredos

- `supabase status` imprime `anon key` e `service_role key` **locais** no terminal — não copiar para relatórios, capturas de tela ou mensagens compartilhadas.
- Nunca abrir, ler, editar ou exibir `app/.env.local` (contém as credenciais do projeto **remoto**) como parte de uma tarefa de stack local — os dois ambientes são propositalmente independentes.
- Se, no futuro, a aplicação precisar rodar contra a stack local (`npm run dev` local apontando para Postgres local), isso exige um arquivo de ambiente **separado** (ex.: `.env.local.supabase-dev`, nunca sobrescrevendo `.env.local`) — decisão e execução de quem opera o projeto, não automatizada por este documento.
- `app/supabase/.temp/` (cache da CLI, incluindo o vínculo remoto) não deve ter seu conteúdo exibido em relatórios — só a existência dos arquivos é informação segura de mencionar.

## 10. Próxima migration a validar

`app/supabase/migrations/20260727000100_mentor_sessions.sql` — primeira fatia de persistência do MentorIAH (`mentor_sessions`, `mentor_messages`; auditada em `docs/product/mentor-iah-persistence-implementation-audit.md`, aprovada na auditoria de código, **ainda não aplicada em nenhum banco**, local ou remoto). É a única migration pendente no repositório no momento deste documento — `supabase start`/`supabase db reset` a aplicariam automaticamente, junto com as 11 anteriores, contra o Postgres local, assim que a stack local existir.

---

Este documento não alterou código, migration, banco (local ou remoto) nem `.env.local`. Nenhum container foi iniciado, nenhuma credencial foi exibida.
