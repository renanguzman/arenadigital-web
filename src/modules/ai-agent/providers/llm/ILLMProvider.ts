// Abstração de provedor de LLM (espelha o padrão gateway de pagamentos).
// Permite trocar OpenAI por outro provedor sem reescrever a orquestração.

export type LLMRole = 'system' | 'user' | 'assistant' | 'tool'

/** Definição de ferramenta exposta ao modelo (JSON Schema nos parâmetros). */
export interface LLMToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface LLMMessage {
  role: LLMRole
  content: string | null
  /** Presente quando o assistant pede execução de ferramentas. */
  toolCalls?: LLMToolCall[]
  /** Presente quando role === 'tool' (resultado de uma ferramenta). */
  toolCallId?: string
  name?: string
}

export interface LLMCompletionRequest {
  model: string
  messages: LLMMessage[]
  tools?: LLMToolDefinition[]
  temperature?: number
  maxOutputTokens?: number
}

export interface LLMUsage {
  promptTokens: number
  completionTokens: number
}

export interface LLMCompletionResult {
  message: LLMMessage
  finishReason: string
  usage: LLMUsage
}

export interface TranscriptionInput {
  audio: Buffer
  mimeType: string
  fileName?: string
  model?: string
}

export interface TranscriptionResult {
  text: string
  model: string
}

export interface ILLMProvider {
  /** Uma rodada de chat (pode retornar toolCalls a executar). */
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResult>
  /** Transcreve áudio (speech-to-text) para texto. */
  transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult>
}
