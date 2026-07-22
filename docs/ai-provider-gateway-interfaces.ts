/**
 * IAH AI Gateway — interfaces TypeScript PROPOSTAS para integração de
 * provedores reais (DeepSeek, Qwen/Alibaba Model Studio, GLM, Kimi).
 *
 * ESTE ARQUIVO NÃO FAZ PARTE DO PRODUTO. Vive fora de `app/`
 * deliberadamente (fora do `tsconfig.json`, do build do Next.js, do
 * ESLint e dos testes) para que nada aqui seja "código funcional" —
 * é só a proposta de contrato, para revisão, antes de qualquer
 * implementação real. Nenhum destes tipos é importado por código do
 * produto. Ver docs/AI_PROVIDER_GATEWAY.md para a auditoria completa.
 *
 * Convenções seguidas (herdadas do `LlmProvider` real em
 * app/src/lib/ai/llm-provider.ts): nomes em inglês, comentários em
 * português explicando o "porquê", nunca o "o quê".
 */

// ============================================================
// 1. Contrato já existente, reproduzido aqui só como referência
// (NÃO é uma proposta — é o que já existe em
// app/src/lib/ai/llm-provider.ts, para comparação).
// ============================================================

interface ExistingLlmCompletionRequest {
  capability: string;
  systemInstructions: string;
  userPrompt: string;
  structuredInput?: unknown;
  structuredContext?: unknown;
}

interface ExistingLlmCompletionResult {
  raw: string;
  provider: string;
  model: string;
}

interface ExistingLlmProvider {
  readonly name: string;
  readonly model: string;
  readonly isConfigured: boolean;
  complete(request: ExistingLlmCompletionRequest): Promise<ExistingLlmCompletionResult>;
}

// ============================================================
// 2. Extensão proposta ao resultado — campos de custo/tokens,
// hoje ausentes. Provider demonstrativo continuaria sem
// preenchê-los (undefined); um provider real preenche.
// ============================================================

export interface ProposedLlmCompletionResult extends ExistingLlmCompletionResult {
  usage?: {
    inputTokens: number;
    outputTokens: number;
    /** Custo estimado em USD, calculado pelo adaptador a partir da tabela de preço do provider. */
    estimatedCostUsd: number;
    /** Tokens servidos de cache, quando o provider reporta (DeepSeek, GLM, Kimi documentam isso). */
    cachedTokens?: number;
  };
  /** Região onde a requisição foi processada, quando o provider declara (ex.: "sg", "us", "cn"). */
  processingRegion?: string;
}

// ============================================================
// 3. ProviderRegistry
// ============================================================

export type ProviderId = "demo" | "deepseek" | "qwen" | "alibaba-model-studio" | "glm" | "kimi";

export interface ProviderRegistry {
  register(id: ProviderId, provider: ExistingLlmProvider): void;
  get(id: ProviderId): ExistingLlmProvider | null;
  list(): ProviderId[];
}

// ============================================================
// 4. CapabilityRouter
// ============================================================

export interface CapabilityRoute {
  primary: ProviderId;
  fallback: ProviderId[];
}

export interface CapabilityRouter {
  /**
   * Resolve o provider para uma capability, respeitando a
   * ProviderPolicy da instituição (bloqueios) antes do fallback
   * estático. Nunca lança — se nada estiver disponível, resolve
   * para "demo" (nunca quebra o fluxo do professor).
   */
  resolve(capability: string, institutionId: string): Promise<ProviderId>;
  configure(capability: string, route: CapabilityRoute): void;
}

// ============================================================
// 5. ProviderPolicy — bloqueio/preferência por instituição
// ============================================================

export interface ProviderPolicy {
  /** Provedores explicitamente permitidos; null = todos exceto os bloqueados. */
  allowedProviders: ProviderId[] | null;
  blockedProviders: ProviderId[];
  /** "somente provedores aprovados pela instituição" — item 10 da política de dados. */
  approvedOnly: boolean;
}

export interface ProviderPolicyStore {
  getForInstitution(institutionId: string): Promise<ProviderPolicy>;
}

// ============================================================
// 6. FallbackPolicy
// ============================================================

export type TransportFailureReason = "timeout" | "network_error" | "rate_limited" | "server_error" | "circuit_open";

export interface FallbackPolicy {
  /** Decide se, dado o motivo da falha, vale tentar o próximo provider da lista. Erro de conteúdo/schema nunca cai aqui — isso é o reparo de JSON do Gateway, não um fallback de provider. */
  shouldFallback(reason: TransportFailureReason, attemptNumber: number): boolean;
}

// ============================================================
// 7. TimeoutPolicy
// ============================================================

export interface TimeoutPolicy {
  /** Timeout em ms, por capability — nunca indefinido. */
  timeoutMsFor(capability: string): number;
}

// ============================================================
// 8. RetryPolicy
// ============================================================

export interface RetryPolicy {
  maxAttempts: number;
  /** Backoff em ms para a tentativa N (exponencial sugerido: baseMs * 2^N). */
  backoffMs(attemptNumber: number): number;
  /** Só falhas de transporte são retentáveis — nunca erro de conteúdo/validação. */
  isRetryable(reason: TransportFailureReason): boolean;
}

// ============================================================
// 9. CircuitBreaker
// ============================================================

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreaker {
  stateFor(providerId: ProviderId): CircuitState;
  reportSuccess(providerId: ProviderId): void;
  reportFailure(providerId: ProviderId): void;
}

// ============================================================
// 10. CostTracker — fecha o loop que GenerationUsage já abre
// ============================================================

export interface CostTrackerEntry {
  institutionId: string;
  userId: string;
  capability: string;
  providerId: ProviderId;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  status: "success" | "error";
  createdAt: string;
}

export interface CostTracker {
  /** Persiste via o mesmo agregado GenerationUsage já existente (modules/docentiah) — não é uma tabela nova. */
  record(entry: CostTrackerEntry): Promise<void>;
  summaryFor(institutionId: string, periodStartIso: string, periodEndIso: string): Promise<{
    totalCostUsd: number;
    totalCalls: number;
    byProvider: Record<ProviderId, { calls: number; costUsd: number }>;
  }>;
}

// ============================================================
// 11. QualityEvaluationRunner — ferramenta de decisão, não roda em produção
// ============================================================

export interface QualityEvaluationCase {
  capability: string;
  input: unknown;
  context: unknown;
  /** Validação estrutural — reaproveita o outputSchema Zod já existente por capability. */
  validate: (output: unknown) => boolean;
}

export interface QualityEvaluationResult {
  providerId: ProviderId;
  capability: string;
  latencyMs: number;
  passedSchema: boolean;
  usage: ProposedLlmCompletionResult["usage"];
}

export interface QualityEvaluationRunner {
  run(cases: QualityEvaluationCase[], providers: ProviderId[]): Promise<QualityEvaluationResult[]>;
}

// ============================================================
// 12. DataAnonymizer
// ============================================================

export type DataSensitivity = "low" | "medium" | "high";

export interface DataAnonymizer {
  /** Mascara padrões óbvios de PII (e-mail, CPF, telefone) em texto livre antes de sair para um provider externo. Nunca roda contra o provider demonstrativo (não precisa — fica local). */
  sanitize(text: string, sensitivity: DataSensitivity): string;
}

// ============================================================
// 13. ProviderAuditLog — obrigatório antes de qualquer provider real
// ============================================================

export interface ProviderAuditEntry {
  institutionId: string;
  capability: string;
  providerId: ProviderId;
  promptVersion: string;
  status: "success" | "error" | "fallback";
  /** Quando status é "fallback", registra por que o principal não foi usado. */
  fallbackReason?: TransportFailureReason;
  timestamp: string;
}

export interface ProviderAuditLog {
  record(entry: ProviderAuditEntry): Promise<void>;
  /** "qual provedor processou a solicitação" — item 10 da política de dados, consultável por instituição. */
  listForInstitution(institutionId: string, limit: number): Promise<ProviderAuditEntry[]>;
}

// ============================================================
// 14. Adaptadores propostos — contratos apenas, SEM implementação,
// SEM SDK, SEM chave. Cada um só precisa satisfazer ExistingLlmProvider;
// a diferença de payload/autenticação fica isolada dentro do próprio
// arquivo do adaptador quando implementado, nunca vaza para o Gateway.
// ============================================================

/**
 * Proposta: app/src/lib/ai/providers/deepseek-provider.ts
 * Base URL OpenAI-compatible: https://api.deepseek.com
 * Contexto: 1M tokens. JSON mode e tool calling documentados.
 * DEEPSEEK_API_KEY — server-only, nunca NEXT_PUBLIC_.
 */
export interface DeepSeekProviderContract extends ExistingLlmProvider {
  readonly name: "deepseek";
}

/**
 * Proposta: app/src/lib/ai/providers/alibaba-model-studio-provider.ts
 * 4 interfaces possíveis (OpenAI-compatible Chat Completion, OpenAI-compatible
 * Responses, Anthropic-compatible Messages, DashScope nativo) — escolher UMA
 * na implementação real, documentar a escolha. Região configurável
 * (Singapura/EUA/China/Japão/Alemanha) — relevante para ProviderPolicy.
 * ALIBABA_MODEL_STUDIO_API_KEY — server-only.
 */
export interface AlibabaModelStudioProviderContract extends ExistingLlmProvider {
  readonly name: "alibaba-model-studio";
  /** Região escolhida na configuração — não presumir uma única região fixa. */
  readonly region: "singapore" | "us" | "china-beijing" | "china-hongkong" | "japan" | "germany";
}

/**
 * Proposta: app/src/lib/ai/providers/qwen-provider.ts
 * SEPARADO de AlibabaModelStudioProvider de propósito: Qwen é a família de
 * modelos; Alibaba Model Studio é a plataforma que os serve. Podem colapsar
 * em um adaptador só (modelo parametrizado) SE a implementação real confirmar
 * que usam a mesma região/autenticação — não presumir isso agora.
 */
export interface QwenProviderContract extends ExistingLlmProvider {
  readonly name: "qwen";
}

/**
 * Proposta: app/src/lib/ai/providers/glm-provider.ts
 * response_format JSON mode, tool calling até 128 funções, streaming SSE.
 * Linha de modelos com visão dedicada (glm-*v*) para uma futura capability
 * multimodal. GLM_API_KEY — server-only.
 */
export interface GlmProviderContract extends ExistingLlmProvider {
  readonly name: "glm";
}

/**
 * Proposta: app/src/lib/ai/providers/kimi-provider.ts
 * Contrato criado, NUNCA registrado no ProviderRegistry até ativação
 * explícita (mesmo padrão de `notConfiguredWebSearchProvider` já usado no
 * projeto) — `isConfigured` sempre `false` enquanto não autorizado.
 * json_schema mode nativo (mais forte dos 4 provedores auditados);
 * contexto até 1.048.576 tokens (kimi-k3).
 */
export interface KimiProviderContract extends ExistingLlmProvider {
  readonly name: "kimi";
  readonly isConfigured: false;
}
