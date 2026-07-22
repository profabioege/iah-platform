# IAH AI Gateway — Auditoria e proposta de arquitetura para provedores reais

> Documento de arquitetura e auditoria. **Nenhum código funcional foi alterado.** Nenhuma chamada externa foi feita, nenhuma chave foi adicionada, nenhum SDK foi instalado, nenhuma migration foi criada. As interfaces TypeScript propostas vivem em `docs/ai-provider-gateway-interfaces.ts` (fora de `app/`, fora do build/lint/tsc do produto) e não são importadas por nenhum código funcional.
>
> Branch: `architecture/iah-ai-gateway-providers`, criada a partir de `feature/conexoes-iah-mvp` (`34fb4d2`), sem alterá-la.

## 1. Escopo

Auditar a arquitetura atual do IAH AI Gateway e propor — sem implementar — o caminho para integrar provedores de LLM reais (DeepSeek, Qwen/Alibaba Model Studio, GLM, Kimi), mantendo o Gateway e os módulos consumidores (DocentIAH, Conexões IAH) intactos.

## 2. O que já existe hoje (inspeção)

| Peça | Arquivo | Estado |
|---|---|---|
| Porto `LlmProvider` | `src/lib/ai/llm-provider.ts` | Já provider-agnostic: `{name, model, isConfigured, complete(request)}`. `LlmCompletionRequest` carrega `capability`, `systemInstructions`, `userPrompt` + `structuredInput`/`structuredContext` opcionais (só o provider demonstrativo lê os dois últimos, porque não interpreta linguagem natural). **Não precisa mudar de forma** para receber um provider real. |
| Provider demonstrativo | `src/lib/ai/providers/demo-llm-provider.ts` | Motor determinístico por regras (sem LLM), `isConfigured: true` sempre. Serve de referência de comportamento honesto (nunca inventa, sempre avisa "motor demonstrativo"). |
| Ponto de troca de provider | `src/lib/ai/llm-provider-factory.ts` | `getLlmProvider()` — hoje sempre retorna o demo. Único lugar que precisa mudar para religar o produto a um provider real; nenhuma tela ou Server Action muda. |
| IAH AI Gateway | `src/lib/ai/gateway.ts` | Existe e é o único ponto de chamada de IA do produto. `execute()`: monta prompt → chama `provider.complete()` → `JSON.parse` + Zod `safeParse` → **uma** tentativa de reparo (reenvia com nota do erro) → nunca expõe JSON quebrado, lança `AiGenerationError`. `executeText()` para capabilities sem schema. `providerOverride` já existe como ponto de injeção (hoje só para teste). |
| Prompts versionados | `src/lib/ai/prompt-template-registry.ts` + `src/lib/ai/prompts/docentiah/{slides,improve-text}/*` | Padrão maduro: `schema.ts` (Zod, fonte única de tipos) → `v1.ts` (system instructions + `buildUserPrompt` separando dados estruturados / `<teacher_context>` / `<web_context untrusted="true">` / `<pdf_context untrusted="true">`, com instrução explícita de ignorar comandos dentro de fontes externas) → `examples.ts` (few-shot) → `index.ts` (registro). Registry por `capability` + versão, sempre pega a mais recente. |
| Geração de slides | `docentiah.generate_slides`, `docentiah.improve_text` | Passa pelo Gateway de ponta a ponta; grava `GenerationUsage` a cada chamada (sucesso e erro). |
| Geração de aula correlacionada (Conexões IAH) | `src/modules/conexoes-iah/infrastructure/providers/demo-curriculum-connection-provider.ts` | **Não passa pelo Gateway.** Implementa `CurriculumConnectionProvider` (`identifyConceptContext`/`suggestIahConnections`/`generateCorrelatedLesson`) como motor determinístico próprio, consultando 4 `KnowledgeSource` locais (currículo, conceitos, conexões IAH curadas, institucional). Sem template versionado no registry, sem chamada a `LlmProvider`. |
| `GenerationUsage` | `src/modules/docentiah/domain/entities.ts` + repositórios | Já tem os campos certos para custo real: `provider`, `model`, `promptVersion`, `inputTokens`, `outputTokens`, `estimatedCost`, `status`. Hoje sempre grava tokens/custo `null` (demo). **Conexões IAH nunca grava usage** — gap a fechar antes de um `CostTracker` fazer sentido lá. |
| Variáveis de ambiente | `.env.local`, `src/lib/auth-flags.ts`, `src/lib/feature-flags.ts` | Nenhuma chave de IA existe hoje (confirmado por grep) — terreno limpo. Convenção do projeto: segredos server-only sem prefixo, nunca `NEXT_PUBLIC_`; um espelho público só quando um client component precisa decidir um branch (via `next.config.ts`, não é o caso de uma chave). |
| Timeout / erro / retry | `gateway.ts` | Só a política de reparo de JSON (1 tentativa extra). **Sem timeout de rede, sem retry de falha de transporte, sem circuit breaker.** |
| Chamadas exclusivamente server-side | confirmado | `lib/ai/*` só é importado por Server Actions (`"use server"`); nenhum `"use client"` importa o Gateway ou um provider. Nenhuma chave chegaria ao bundle do navegador nesse desenho. |

## 3. Lacunas principais

1. **Conexões IAH fora do Gateway** — para virar capability real, precisa de prompts versionados próprios e de o LLM entrar como camada de *síntese* sobre o que as 4 knowledge sources já recuperam (a extração continua determinística; só a redação final passa a ser do modelo).
2. **`docentiah.generate_assessment` não existe** — o wizard de Avaliação (D-045) termina em botão desabilitado; não há prompt, schema nem Server Action ligada ao Gateway.
3. **Sem `ProviderRegistry`/roteamento por capability** — hoje é uma função global só; não dá para usar provedores diferentes por capability, nem fallback entre eles.
4. **Sem timeout/retry/circuit breaker** de transporte.
5. **`GenerationUsage` não cobre Conexões IAH.**
6. **Sem configuração por instituição** (bloquear/preferir provedor).
7. **Sem anonimização formal** — hoje inofensivo porque nada sai da máquina; passa a ser necessário assim que um provider externo entrar.
8. **Mentor IAH e `documents.extract_and_summarize`** não têm nenhuma capability nem prompt hoje — `modules/mentor` só tem um porto de conversa (`MentorProvider`) com um provider demonstrativo próprio, arquitetura paralela e independente do IAH AI Gateway.

## 4. Diagrama textual do fluxo (proposto, com Registry/Router)

```
Server Action (ex.: generateSlidesAction, conexoes-iah/actions.ts)
        │
        ▼
IAH AI Gateway (gateway.ts)
        │  1. ensurePromptsRegistered()
        │  2. template = promptTemplateRegistry.getLatest(capability)
        │  3. provider = CapabilityRouter.resolve(capability, institutionId)   ← NOVO
        │       │
        │       ├─ ProviderPolicy(institutionId) filtra provedores bloqueados  ← NOVO
        │       └─ FallbackPolicy define ordem [principal, alternativo...]     ← NOVO
        │  4. userPrompt = template.buildUserPrompt(input, context)
        │  5. DataAnonymizer.sanitize(userPrompt, sensitivity)                 ← NOVO (antes de sair)
        │  6. TimeoutPolicy + RetryPolicy + CircuitBreaker envolvem a chamada  ← NOVO
        │
        ▼
ProviderRegistry.get(providerId) → LlmProvider.complete(request)               ← contrato já existe
        │
        ├─ sucesso → JSON.parse + Zod safeParse (já existe)
        │              │
        │              ├─ inválido → 1 tentativa de reparo (já existe)
        │              └─ válido → CostTracker.record(usage) + ProviderAuditLog.record(...)  ← NOVO
        │
        └─ falha de transporte/timeout → CircuitBreaker.reportFailure(providerId)
                                        → FallbackPolicy tenta o próximo da lista
                                        → se todos falharem → AiGenerationError (já existe)
```

Nenhuma peça nova entra *dentro* do provider — cada adaptador (`DeepSeekProvider` etc.) continua implementando só `LlmProvider.complete()`; toda a orquestração nova fica no Gateway/Router, mantendo o porto simples.

## 5. Contratos que cada provedor precisa suportar — não presumidos iguais

Levantado na documentação pública de cada provedor nesta auditoria (não presumido de memória):

| Recurso | DeepSeek | Qwen / Alibaba Model Studio | GLM (Zhipu/Z.ai) | Kimi (Moonshot) |
|---|---|---|---|---|
| Formato de mensagens | Compatível com OpenAI *e* Anthropic (`/anthropic`) | 4 interfaces: OpenAI-compatible Chat Completion, OpenAI-compatible *Responses* (com web search/code interpreter embutidos), Anthropic-compatible Messages, DashScope nativo | Roles `system/user/assistant/tool`, conteúdo multimodal em array | Compatível com OpenAI (SDK oficial usa `OpenAI(base_url=...)`) |
| JSON estruturado | Suportado ("JSON Output" documentado) | Depende da interface escolhida (nativa DashScope tem mais parâmetros) | `response_format: {"type":"json_object"}` | 3 modos: texto, JSON mode, **`json_schema`** (schema explícito — mais próximo do que o Gateway já faz com Zod) |
| Tool calling | Suportado ("Tool Calls" documentado) | Suportado (Anthropic-compatible "supports thinking and tool calling") | Até 128 funções, `tool_stream` para streaming de chamada (GLM-4.6+) | Suportado, com `finish_reason:"tool_calls"` |
| Streaming | Suportado (`stream: true`) | Suportado (interfaces OpenAI/Anthropic-compatible) | Suportado (Server-Sent Events, `data: [DONE]`) | Suportado (SSE, `stream_options.include_usage` inclui tokens no chunk final) |
| Contexto longo | **1M tokens** (documentado), saída máx. 384K | Não documentado nesta auditoria (verificar por modelo: Qwen-Max/Plus/Flash) | Não levantado nesta auditoria (verificar por modelo) | `kimi-k3`: até **1.048.576 tokens** (1M) |
| Visão/multimodal | Não documentado nesta página (verificar) | Sim — "visual understanding, image generation, video generation, speech" | Sim — modelos `*V*` dedicados (`glm-5v-turbo`, `glm-4.6v`), até 150 imagens ou 2 vídeos (200MB) | Sim — `image_url`/`video_url` no conteúdo, inclui referência a arquivo via `ms://<file_id>` |
| Arquivos | Não documentado nesta auditoria | Não levantado | PDF, Word, Excel documentados como aceitos em conteúdo multimodal | Referenciável via `ms://<file_id>` |
| Contabilização de tokens | Mencionado ("Token & Token Usage"), formato não confirmado | Não levantado | `prompt_tokens`/`completion_tokens`/`total_tokens` + `cached_tokens` separado | `prompt_tokens`/`completion_tokens`/`total_tokens` + `cached_tokens` |
| Erros e limites | "Error Codes" e "Rate Limit & Isolation" documentados, formato não confirmado nesta auditoria | Não levantado | Não levantado nesta auditoria | Não levantado nesta auditoria |
| Região de processamento | Não declarada na documentação consultada (empresa sediada na China — inferência, não confirmação documental) | **6 regiões declaradas**: Singapura, EUA (Virgínia), China (Pequim), China (Hong Kong), Japão (Tóquio), Alemanha (Frankfurt) — permite escolher região fora da China continental | Não levantado nesta auditoria | Endpoint `api.moonshot.ai/v1`; plataforma espelhada em `platform.kimi.ai` — sugere operação chinesa, região alternativa não confirmada |

**Implicação de arquitetura:** o `json_schema` mode do Kimi é o único, entre os quatro, que aceita um JSON Schema explícito na chamada — mais robusto que pedir JSON por instrução de texto (o que os outros três fazem). Vale usá-lo quando disponível, mas o Gateway **já valida com Zod depois**, então isso é reforço, não dependência — nenhum provider precisa ter esse recurso para funcionar com o Gateway atual.

## 6. Arquitetura proposta (11 peças)

Interfaces completas em `docs/ai-provider-gateway-interfaces.ts` (arquivo `.ts` fora de `app/`, fora do `tsconfig`/build/lint do produto — puramente de referência, nenhum import real aponta para lá).

1. **`ProviderRegistry`** — `Map<providerId, LlmProvider>`; cada adaptador se registra; substitui `getLlmProvider()` fixo.
2. **`CapabilityRouter`** — resolve `(capability, institutionId) → providerId` a partir de uma config estática (por enquanto) + preferência futura por instituição.
3. **`ProviderPolicy`** — por instituição: lista de provedores permitidos/bloqueados (item 10 da política de dados).
4. **`FallbackPolicy`** — ordem `[principal, alternativo, ...]` por capability; decide se um erro específico permite tentar o próximo.
5. **`TimeoutPolicy`** — timeout configurável por provider (`AbortController`), nunca indefinido.
6. **`RetryPolicy`** — retry exponencial só para falha de transporte/5xx, nunca para erro de conteúdo (isso já é resolvido pelo reparo de JSON do Gateway).
7. **`CircuitBreaker`** — N falhas seguidas de um provider → `isConfigured` reportado como indisponível por T minutos; `CapabilityRouter` pula para o fallback.
8. **`CostTracker`** — fecha o loop que `GenerationUsage` já abre: todo adaptador real devolve tokens/custo; passa a ser gravado sempre (inclusive em Conexões IAH, que hoje não grava nada).
9. **`QualityEvaluationRunner`** — roda os mesmos casos fixos (os `tests/*.test.mjs` já existentes servem de fixture) contra cada provider configurado e registra latência/custo/aderência ao schema — ferramenta de decisão, não entra em produção.
10. **`DataAnonymizer`** — mascara padrões óbvios de PII em texto livre do professor antes de sair para um provider externo; nunca roda no demo.
11. **`ProviderAuditLog`** — registro append-only de `{institutionId, capability, providerId, promptVersion, status, timestamp}` — não duplica `GenerationUsage` (que é sobre custo), é sobre **qual provedor processou o quê**, exigido pela política de dados (item 10).

## 7. Capabilities iniciais

| Capability | Provedor principal | Alternativo | Critério de escolha | Schema de resposta | Timeout | Fallback? | Sensibilidade |
|---|---|---|---|---|---|---|---|
| `docentiah.generate_slides` | DeepSeek | Qwen/Model Studio | Já tem schema Zod maduro (`docentiahSlidesGenerationOutputSchema`), contexto curto, custo baixo prioritário | `DocentiahSlidesGenerationOutput` (existente) | 30s | Sim | Baixa — disciplina/tema/série, texto livre do professor sem PII estrutural |
| `docentiah.generate_assessment` | DeepSeek | Qwen/Model Studio | Mesmo perfil de slides; adaptação pedagógica (D-045) exige JSON bem estruturado — usar `json_schema` mode quando o provider suportar | Novo (a criar, mesmo padrão de slides) | 30s | Sim | Baixa/Média — pode referenciar necessidades de adaptação (ex.: "neurodivergente") sem nome de aluno |
| `docentiah.improve_context` (hoje `docentiah.improve_text`) | Qwen/Model Studio (texto curto, barato) | DeepSeek | Tarefa simples de reescrita — priorizar latência/custo sobre poder de raciocínio | Texto livre (`executeText`) | 10s | Sim | Baixa |
| `conexoes_iah.identify_context` | DeepSeek | GLM | Precisa sintetizar o resultado das 4 knowledge sources com fidelidade — priorizar aderência a schema | Novo (`IdentifiedContextSnapshot`, já existe como tipo de domínio) | 20s | Sim | Baixa — catálogo institucional público |
| `conexoes_iah.suggest_connections` | DeepSeek | GLM | Mesma lógica de identify_context; conexões continuam vindo do catálogo curado, LLM só organiza/prioriza | Novo (`SelectedConnection[]`, já existe como tipo) | 20s | Sim | Baixa |
| `conexoes_iah.generate_correlated_lesson` | DeepSeek | Qwen/Model Studio | Geração mais longa (21 campos) — contexto de 1M do DeepSeek é folga real aqui | `CorrelatedLessonContent` (existente) | 45s | Sim | Baixa |
| `mentor_iah.guide_student` | **Fora deste escopo** | — | `modules/mentor` tem arquitetura própria (`MentorProvider`), paralela ao IAH AI Gateway — precisaria de decisão separada sobre unificar ou manter os dois portos | — | — | — | **Alta** — conversa direta com aluno; qualquer integração real exige política de dados própria, revisão antes deste plano avançar |
| `documents.extract_and_summarize` | Kimi | GLM | Contexto de 1M do Kimi favorece documentos longos; suporte a arquivo via `ms://<file_id>` é nativo | Novo | 60s | Sim | **Média/Alta** — depende do conteúdo do documento anexado pelo professor (mesma cautela já aplicada ao PDF de slides: nunca gravado em disco) |

## 8. Política obrigatória de dados

- Nunca enviar nome de aluno a um provider externo quando a capability não precisa dele — nenhuma capability hoje precisa (confirmado por inspeção: slides e Conexões IAH usam só disciplina/série/tema/texto livre do professor).
- Nunca enviar diagnóstico, laudo ou dado sensível de aluno — não há campo estruturado para isso em nenhum wizard hoje; a política vale sobretudo para texto livre ("contexto adicional"), onde `DataAnonymizer` atua.
- Turmas/usuários anonimizados no prompt: usar identificador interno (`classroomId`), nunca o nome exibido na interface.
- `ProviderAuditLog` registra qual provider processou cada solicitação — obrigatório antes de qualquer provider real entrar em produção.
- `ProviderPolicy` por instituição — uma instituição pode bloquear um provider específico (ex.: só provedores com região fora da China, por política própria).
- Chaves nunca no cliente — já garantido pela arquitetura atual (Server Actions only); manter como invariante ao adicionar adaptadores.
- Modo "somente provedores aprovados pela instituição" — `CapabilityRouter.resolve()` deve recusar (cair no demo, nunca falhar silenciosamente) se nenhum provider da lista permitida estiver disponível.

## 9. Matriz comparativa arquitetural

| Critério | DeepSeek | Qwen / Alibaba Model Studio | GLM (Zhipu/Z.ai) | Kimi (Moonshot) |
|---|---|---|---|---|
| Compatibilidade com `LlmProvider` | Alta — OpenAI-compatible direto | Alta — 4 interfaces, uma delas OpenAI-compatible | Alta — formato próprio bem documentado, próximo de OpenAI | Alta — SDK oficial usa padrão OpenAI |
| Texto em português | Não documentado nesta auditoria (modelos generalistas fortes; qualidade em PT-BR precisa do `QualityEvaluationRunner`, não presumir) | idem | idem | idem |
| JSON estruturado | Sim (modo dedicado) | Depende da interface escolhida | Sim (`response_format`) | Sim, com **`json_schema`** explícito (o mais forte dos quatro) |
| Contexto longo | **1M tokens** | Não confirmado nesta auditoria (verificar por modelo) | Não confirmado nesta auditoria | **Até 1M tokens** (`kimi-k3`) |
| Multimodalidade | Não confirmada nesta página consultada | Sim (visão, geração de imagem/vídeo, voz) | Sim (linha `*V*` dedicada) | Sim (imagem/vídeo no conteúdo) |
| Custo | Muito baixo (ex.: ~US$0,14–0,44/1M tokens de entrada) | Não levantado nesta auditoria | De grátis (Flash) a ~US$1,4/4,4 por 1M (topo de linha) | Não levantado nesta auditoria |
| Latência | Não medida — exige `QualityEvaluationRunner` real | idem | idem | idem |
| Disponibilidade internacional | Endpoint único documentado, região não declarada | **Mais forte dos quatro** — 6 regiões, incluindo Singapura/EUA/Alemanha/Japão fora da China continental | Não levantada | Endpoint único, região não confirmada |
| Privacidade/retenção | Não declarada na documentação consultada | Declarada explicitamente: "nunca usa dados para treinar modelo", tráfego criptografado | Não levantada | Não levantada |
| Esforço de integração | Baixo — compatível OpenAI, contexto vasto, preço simples | Médio — 4 interfaces para escolher, mais decisão de design | Baixo/Médio — formato próprio mas bem documentado | Baixo — compatível OpenAI, `json_schema` reduz trabalho de prompt |
| Melhor uso no IAH | Capabilities de geração estruturada de conteúdo pedagógico (slides, aula correlacionada) — custo baixo e contexto grande cabem no perfil de uso do produto | Melhor opção quando região/residência de dados fora da China for exigida por uma instituição | Boa opção de fallback / capabilities com necessidade de tool calling mais pesado (128 funções) | Melhor opção para `documents.extract_and_summarize` (contexto 1M + arquivo nativo) |

**Nota de honestidade:** vários campos ("latência", "texto em PT-BR", parte da "privacidade/retenção" de DeepSeek/GLM/Kimi) não puderam ser confirmados só com a documentação pública consultada nesta auditoria — estão marcados como não levantados, não presumidos. Antes de qualquer integração real, o `QualityEvaluationRunner` (item 9 da arquitetura) deve gerar esses números com os casos de teste reais do produto.

## 10. Recomendação avaliada (não assumida antes desta auditoria)

**DeepSeek como primeiro adaptador real** se sustenta pelos fatos levantados: compatível com o formato que o `LlmProvider` já espera, contexto de 1M tokens (folga grande para `generate_correlated_lesson`, o maior payload do produto), custo por token entre os mais baixos verificados. **Qwen/Alibaba Model Studio como segundo** também se sustenta, mas por um motivo diferente do custo: é o único dos quatro com região de processamento declarada fora da China continental (Singapura/EUA/Alemanha/Japão) — relevante se alguma instituição exigir isso via `ProviderPolicy`. GLM e Kimi ficam como terceiro/quarto: GLM por tool calling mais robusto (fallback de capabilities futuras com function calling pesado), Kimi por contexto de 1M + suporte nativo a arquivo (`documents.extract_and_summarize`, ainda fora do escopo do produto hoje).

## 11. Plano incremental para o primeiro provedor real (DeepSeek)

1. `DeepSeekProvider implements LlmProvider` — `isConfigured` checando `DEEPSEEK_API_KEY` presente (ausente ⇒ `false`, mesmo padrão de `isGoogleAuthConfigured()`); sem key, o produto continua no demo automaticamente.
2. `ProviderRegistry` com 2 entradas (`demo`, `deepseek`).
3. `CapabilityRouter` com **1 capability só** (`docentiah.generate_slides`) apontando para `deepseek`, fallback `demo`.
4. `TimeoutPolicy` simples (30s) envolvendo a chamada; sem `RetryPolicy`/`CircuitBreaker` completos ainda nesta primeira fase.
5. Validar com `QualityEvaluationRunner` contra os casos já existentes em `tests/docentiah-*.test.mjs` antes de expandir para outra capability.
6. Só depois disso: `GenerationUsage` real (tokens/custo), `docentiah.improve_context`, e então Conexões IAH.

## 12. Riscos de privacidade e operação

- **Privacidade:** texto livre do professor sairia da máquina pela primeira vez — hoje é 100% local (demo). Nenhum dado de aluno entra em prompt algum hoje (confirmado por inspeção); a política do item 8 deve continuar garantindo isso por design, não por acidente.
- **Operação:** dependência de um provider externo introduz um novo ponto de falha fora do controle do produto — `CircuitBreaker` + fallback para o demo (nunca erro cru para o professor) é obrigatório antes de qualquer capability real ir ao ar.
- **Custo:** sem `CostTracker` ativo desde o primeiro dia, não há visibilidade de gasto por instituição — implementar junto com o primeiro adaptador, não depois.
- **Região/soberania de dados:** DeepSeek não declara região na documentação pública consultada — instituições com exigência contratual de dados fora da China devem ser roteadas para Qwen/Model Studio (região configurável) via `ProviderPolicy`, nunca para DeepSeek por padrão nesse cenário.
- **Vendor lock-in de prompt:** os `system instructions` atuais já são genéricos o bastante (testados só contra o demo) — validar que funcionam igualmente bem contra um modelo real antes de assumir que o texto do prompt não precisa mudar por provider.
