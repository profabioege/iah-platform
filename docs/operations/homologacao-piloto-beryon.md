# Homologação do piloto — Colégio Beryon (turma de 45)

Branch `pilot/beryon-40-alunos`. Candidata **técnica**, validada localmente com
contas e conteúdos sintéticos. **Não libera estudantes reais** — a lista de
condições pendentes está no fim deste documento.

## 1. O que mudou na arquitetura

Antes, toda consulta do servidor usava a `service_role`, que ignora RLS; o
isolamento entre escolas dependia só do filtro por `institution_id` no código.

Agora existe um segundo caminho, de menor privilégio:

```
Auth.js (sessão) → ator reconferido no banco → JWT curto (papel iah_app)
                 → PostgREST → policies (migration 0010) → PostgreSQL
```

- **`service_role`**: só caminho administrativo — autenticação,
  provisionamento, recuperação assistida.
- **`iah_app`**: telas e ações pedagógicas. Sem DELETE em nenhuma tabela, sem
  acesso a `users`, `profiles`, `admin_audit_log` e `auth_login_attempts`.
- As policies aplicam instituição, papel, vínculo com a turma e dono do
  registro. A reflexão do aluno só chega ao professor quando marcada como
  compartilhada.

Sem `SUPABASE_JWT_SECRET` a instância **não** entra em modo real: fica
indisponível, sem cair em demonstração.

## 2. Ambiente de teste local (o que roda hoje)

Requer Podman. Nada toca banco remoto: o procedimento recusa destino que não
seja local e descartável.

```bash
cd app
npm ci
npm test                 # suíte da aplicação (385 testes)
npm run test:pilot       # PostgreSQL + PostgREST efêmeros + suítes do piloto
```

`npm run test:pilot` sobe dois contêineres, aplica as 11 migrations, expõe a API
pelo mesmo caminho do Supabase (`/rest/v1`) e roda as suítes de fumaça,
provisionamento, isolamento e ciclo pedagógico.

Ensaios de carga (medição local, **não** vale como capacidade da hospedagem):

```bash
node --experimental-strip-types scripts/pilot-load-test.mjs --students=45 --entry-window=60
node --experimental-strip-types scripts/pilot-load-test.mjs --students=65 --entry-window=60
node --experimental-strip-types scripts/pilot-load-test.mjs --students=45   # pior caso: todos juntos
```

## 3. Provisionamento da turma

Arquivo de turma (JSON), sem dado pessoal além de nome e identificador escolar:

```json
{
  "institution": { "id": "inst-beryon", "name": "Colégio Beryon", "slug": "colegio-beryon", "domain": "beryon.test" },
  "academicYear": { "id": "ay-beryon-2026", "label": "2026", "startsOn": "2026-02-01", "endsOn": "2026-12-15" },
  "classroom": { "id": "class-beryon-1", "name": "1ª série A", "grade": "1ª série E.M." },
  "teacher": { "id": "teacher-beryon-1", "name": "…", "email": "professor@beryon.test" },
  "managers": [{ "id": "manager-beryon-1", "name": "…", "email": "gestor@beryon.test" }],
  "students": [{ "externalId": "2026-1A-001", "name": "…" }]
}
```

```bash
# 1. simulação — mostra o plano, não escreve nada
node --experimental-strip-types scripts/pilot-provision.mjs --roster=./turma.json

# 2. execução — exige confirmação do id da instituição
node --experimental-strip-types scripts/pilot-provision.mjs \
  --roster=./turma.json --execute --confirm-institution=inst-beryon \
  --actor="cli:coordenacao" --credentials-out=./credenciais.csv
```

- Cada conta nasce com **senha temporária individual** e troca obrigatória no
  primeiro acesso. Não existe senha coletiva.
- O arquivo de credenciais é a única cópia: entregue individualmente pela escola
  e apague depois. Ele não vai para o Git nem para o banco.
- Repetir é seguro: contas e matrículas existentes são reconhecidas; linha
  duplicada no lote e e-mail de outro papel são recusados e reportados.
- **E-mail pessoal do aluno não é exigido**: sem e-mail na planilha, o login usa
  um endereço institucional derivado do identificador escolar
  (`aluno.<identificador>@<domínio>`), que serve apenas como nome de usuário.

Recuperação assistida (pedido da escola, nunca autoatendimento):

```bash
node --experimental-strip-types scripts/pilot-credential-reset.mjs \
  --email=aluno.20261a001@beryon.test --execute \
  --actor="cli:coordenacao" --reason="pedido da coordenação em 18/09"
```

Isso gera nova senha temporária, exige troca no próximo acesso e **invalida as
sessões abertas** com a credencial anterior.

## 4. Variáveis do ambiente de homologação

Exportadas na sessão do operador ou no painel do provedor — nunca em arquivo do
repositório:

| Variável | Para quê |
|---|---|
| `IAH_AUTH_MODE=supabase` | declara o modo; ausência ou valor inválido bloqueia |
| `AUTH_SECRET` | assina a sessão do Auth.js |
| `NEXT_PUBLIC_SUPABASE_URL` | endpoint do PostgREST do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | caminho administrativo |
| `SUPABASE_JWT_SECRET` | assina o acesso `iah_app` (menor privilégio) |
| `NEXT_PUBLIC_BUILD_COMMIT`, `NEXT_PUBLIC_BUILD_BRANCH`, `NEXT_PUBLIC_BUILD_ENVIRONMENT`, `NEXT_PUBLIC_BUILD_TIME` | identificação exibida em `/api/versao` (só para gestor autenticado) |

No Supabase hospedado, o papel do PostgREST precisa poder assumir `iah_app`:

```sql
grant iah_app to authenticator;
```

## 5. Roteiro da homologação (ordem sugerida)

1. Criar projeto Supabase **dedicado à homologação** (nunca o de produção).
2. Aplicar as migrations `0001`…`0011` nesse projeto.
3. Rodar `grant iah_app to authenticator;`.
4. Publicar a aplicação apontando para ele, com as variáveis acima.
5. Conferir `/api/versao` com uma conta de gestor: commit, branch e modo.
6. Provisionar a turma sintética (45 contas) com a CLI, em simulação e depois
   em execução.
7. Percorrer o ciclo completo com contas sintéticas: professor publica, aluno
   rascunha, sai, volta em outro dispositivo, entrega, reflete; professor dá
   devolutiva; aluno lê.
8. Rodar o ensaio de carga HTTP contra a homologação (45 e 65), pela rede da
   escola, no horário da aula.
9. Ensaiar backup e restauração completa nesse projeto, com tempo medido.
10. Só então avaliar a liberação com estudantes reais.

## 6. Resultados dos ensaios locais (18/09/2026)

Máquina local, PostgreSQL 16.4 + PostgREST 12.2.3 em contêiner, 45/65 contas
sintéticas, todas saindo do mesmo IP.

| Cenário | Login p50/p95 | Gravações p50/p95 | Erros | Integridade |
|---|---|---|---|---|
| 45 alunos, entrada em 60s | 76 / 104 ms | 267 / 589 ms | 0 | 45 entregas, 45 reflexões, sem duplicata nem mistura |
| 65 alunos, entrada em 60s | 74 / 110 ms | 452 / 721 ms | 0 | 65 entregas, 65 reflexões, sem duplicata nem mistura |
| 45 alunos, todos no mesmo instante | 2115 / 2163 ms | 120 / 493 ms | 0 | 45 entregas, 45 reflexões, íntegras |

O terceiro cenário **reprovou** no limite declarado de p95 de login (2000 ms). A
causa é conhecida e não é o banco: o `scrypt` das 45 senhas concorre pela CPU de
uma única máquina. Em hospedagem com instâncias paralelas o comportamento tende a
ser melhor, mas isso **precisa ser medido lá** — é uma das condições abaixo.

## 7. Condições ainda necessárias antes de estudantes reais

1. Projeto Supabase de homologação separado, com as migrations aplicadas.
2. Backup e restauração ensaiados, com tempo de recuperação medido.
3. Ensaio de carga HTTP na homologação, pela rede do colégio, incluindo o pico
   de entrada.
4. Exportação de dados por turma e procedimento para pedidos de titulares.
5. Monitoramento com alerta de erro e trilha de auditoria acessível.
6. Suporte definido para a primeira aula: canal, prioridade e tempo de resposta.
7. Política de privacidade publicada e instrumento de proteção de dados assinado
   com a escola (controladora), incluindo consentimento dos responsáveis.
8. Ensaio na rede do colégio (bloqueios, proxy, largura de banda).
9. Decisão sobre sondagem e DocentIAH, hoje restritos ao modo demonstração.
10. Plano de reversão da aula: o que fazer se a plataforma cair no meio.
