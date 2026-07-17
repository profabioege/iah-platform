# Google Workspace — Infraestrutura preparada

Este documento registra o que foi construído nesta Sprint (arquitetura, sem
nenhuma dependência externa) e o que falta fazer, fora do código, para
ativar a integração real com Google Workspace (login do professor + Google
Classroom). Ver `DECISIONS.md` (D-019) para a decisão arquitetural completa.

## Estado atual

**Nada aqui faz uma chamada de rede real.** Toda a UI e todo o domínio da
Plataforma dependem apenas dos contratos abaixo; a implementação usada hoje
é sempre a simulada (`mock*`). O card "Integrações" no Painel do Professor
(`/professor`) mostra "○ Não configurado" porque nenhuma credencial existe
— isso é esperado e correto nesta fase.

## Arquitetura

```
app/src/modules/integrations/
├── auth/
│   ├── domain/auth-provider.ts            ← contrato AuthProvider
│   └── infrastructure/
│       ├── mock-auth-provider.ts          ← usado hoje
│       └── google-auth-provider.ts        ← stub, lança erro se chamado
├── classroom/
│   ├── domain/classroom-provider.ts       ← contrato ClassroomProvider
│   └── infrastructure/
│       ├── mock-classroom-provider.ts     ← usado hoje
│       └── google-classroom-provider.ts   ← stub, lança erro se chamado
├── config.ts                              ← isGoogleWorkspaceConfigured()
└── index.ts                               ← ponto de entrada público
```

- **`AuthProvider`**: `signIn()`, `signOut()`, `getSession()`. Quem consome nunca sabe se está falando com o mock ou com o Google.
- **`ClassroomProvider`**: `listCourses()`, `listStudents(courseId)`, `publishMission(courseId, missionId)` — hoje `publishMission` não publica nada de verdade, mesmo na implementação real futura isso deve continuar exigindo confirmação explícita antes de qualquer publicação real numa turma.
- **`isGoogleWorkspaceConfigured()`**: único ponto de decisão sobre se as credenciais existem (hoje sempre `false`); é o que o card do Painel do Professor lê para decidir o que mostrar.
- Mesmo padrão já usado em `modules/library` (`MissionReader`) e `modules/classroom` (`ClassMonitorReader`): domínio nunca conhece a implementação concreta.

## Credenciais que serão necessárias (futuro)

| Variável | Para quê |
|---|---|
| `GOOGLE_CLIENT_ID` | Identificador OAuth do app no Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Segredo OAuth (nunca em código/commit — só `app/.env.local` e Vercel) |
| `GOOGLE_REDIRECT_URI` | URL de callback após o login (ex.: `https://iah-platform.vercel.app/api/auth/google/callback`) |

## APIs que serão utilizadas (futuro)

- **Google Identity Services / OAuth 2.0** — login do professor (e, depois, do aluno).
- **Google Classroom API**, escopos previstos:
  - `classroom.courses.readonly` — listar cursos/turmas.
  - `classroom.rosters.readonly` — listar alunos de uma turma.
  - `classroom.coursework.students` — publicar uma Missão como atividade (fase futura, não coberta por esta Sprint).

Todos esses são **escopos restritos/sensíveis** do Google — sujeitos a
verificação do app pelo Google antes de sair do modo de teste (ver abaixo).

## Passos a executar no Google Cloud Console (futuro, fora deste repositório)

1. Criar um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ativar a **Google Classroom API** no projeto.
3. Configurar a **tela de consentimento OAuth** (nome do app, logo, domínio, escopos acima).
4. Criar uma **credencial OAuth 2.0 Client ID** do tipo "Aplicação Web", com a(s) URI(s) de redirecionamento autorizada(s) (produção + local, se necessário).
5. Enquanto o app não for verificado pelo Google: adicionar manualmente cada conta de teste (ex.: e-mail do mantenedor/professor da demonstração) como **test user** — sem isso, o login falha para qualquer conta fora da lista. Também será exibida uma tela de aviso "app não verificado" para essas contas.
6. Se o uso for além de um punhado de contas de teste: iniciar o **processo de verificação do Google** para escopos restritos — pode levar de dias a semanas e exigir vídeo de demonstração do uso dos dados.
7. Definir `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` em `app/.env.local` (dev) e no painel da Vercel (produção).

## Como ativar quando as credenciais existirem

1. Definir as três variáveis de ambiente acima.
2. `isGoogleWorkspaceConfigured()` passa a retornar `true` automaticamente — o card do Painel do Professor já reflete isso sem mudança de código.
3. Implementar de fato `google-auth-provider.ts` e `google-classroom-provider.ts` (hoje stubs que lançam erro) com chamadas reais à API.
4. Trocar a injeção de `mockAuthProvider`/`mockClassroomProvider` por `googleAuthProvider`/`googleClassroomProvider` nos pontos que os consomem — nenhum componente de UI muda, pelo mesmo motivo que troca de fonte de dados nunca mexeu em UI neste projeto.
