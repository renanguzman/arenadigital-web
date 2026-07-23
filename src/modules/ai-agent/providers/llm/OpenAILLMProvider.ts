import type {
  ILLMProvider,
  LLMCompletionRequest,
  LLMCompletionResult,
  LLMMessage,
  LLMToolCall,
  TranscriptionInput,
  TranscriptionResult,
} from './ILLMProvider'

// Implementação OpenAI via REST (sem SDK, para evitar dependência extra).
// Chat Completions + Audio Transcriptions.

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_TRANSCRIBE_MODEL = 'whisper-1'

interface OpenAIChatMessage {
  role: string
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}

function toOpenAIMessages(messages: LLMMessage[]): OpenAIChatMessage[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
        })),
      }
    }
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content ?? '', tool_call_id: m.toolCallId }
    }
    return { role: m.role, content: m.content }
  })
}

function parseToolCalls(
  raw: OpenAIChatMessage['tool_calls']
): LLMToolCall[] | undefined {
  if (!raw?.length) return undefined
  return raw.map((tc) => {
    let args: Record<string, unknown> = {}
    try {
      args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
    } catch {
      args = {}
    }
    return { id: tc.id, name: tc.function.name, arguments: args }
  })
}

export class OpenAILLMProvider implements ILLMProvider {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY) {}

  private getKey(): string {
    if (!this.apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    return this.apiKey
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResult> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: toOpenAIMessages(request.messages),
      temperature: request.temperature ?? 0.3,
    }
    if (request.maxOutputTokens) body.max_tokens = request.maxOutputTokens
    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
      body.tool_choice = 'auto'
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`OpenAI chat error ${response.status}: ${detail.slice(0, 500)}`)
    }

    const json = (await response.json()) as {
      choices: Array<{ message: OpenAIChatMessage; finish_reason: string }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    const choice = json.choices?.[0]
    if (!choice) throw new Error('OpenAI chat error: empty choices')

    const message: LLMMessage = {
      role: 'assistant',
      content: choice.message.content ?? null,
      toolCalls: parseToolCalls(choice.message.tool_calls),
    }

    return {
      message,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
      },
    }
  }

  async transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
    const model = input.model ?? process.env.OPENAI_TRANSCRIBE_MODEL ?? DEFAULT_TRANSCRIBE_MODEL
    const form = new FormData()
    const blob = new Blob([new Uint8Array(input.audio)], { type: input.mimeType })
    form.append('file', blob, input.fileName ?? 'audio.ogg')
    form.append('model', model)
    form.append('language', 'pt')

    const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.getKey()}` },
      body: form,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`OpenAI transcription error ${response.status}: ${detail.slice(0, 500)}`)
    }

    const json = (await response.json()) as { text?: string }
    return { text: (json.text ?? '').trim(), model }
  }
}
