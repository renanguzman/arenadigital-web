import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.types'
import type { IAgentRepository } from './IAgentRepository'
import {
  DEFAULT_AGENT_MODEL,
  type AgentConfig,
  type AgentConfigRow,
  type AgentStatus,
  type UpdateAgentConfigInput,
} from '../types/agent.types'

function toDomain(row: AgentConfigRow): AgentConfig {
  return {
    arenaId: row.arena_id,
    enabled: row.enabled,
    personaPrompt: row.persona_prompt,
    model: row.model,
    temperature: Number(row.temperature),
    maxOutputTokens: row.max_output_tokens,
    monthlyTokenCap: row.monthly_token_cap,
    fallbackMessage: row.fallback_message,
    status: (row.status as AgentStatus) ?? 'draft',
    updatedAt: row.updated_at,
  }
}

export class SupabaseAgentRepository implements IAgentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getByArenaId(arenaId: string): Promise<AgentConfig | null> {
    const { data, error } = await this.client
      .from('arena_ai_agents')
      .select('*')
      .eq('arena_id', arenaId)
      .maybeSingle()

    if (error) throw new Error(`SupabaseAgentRepository.getByArenaId: ${error.message}`)
    return data ? toDomain(data) : null
  }

  async upsert(
    arenaId: string,
    patch: UpdateAgentConfigInput,
    createdBy?: string | null
  ): Promise<AgentConfig> {
    const payload = {
      arena_id: arenaId,
      ...(patch.personaPrompt !== undefined ? { persona_prompt: patch.personaPrompt } : {}),
      ...(patch.model !== undefined ? { model: patch.model || DEFAULT_AGENT_MODEL } : {}),
      ...(patch.temperature !== undefined ? { temperature: patch.temperature } : {}),
      ...(patch.maxOutputTokens !== undefined ? { max_output_tokens: patch.maxOutputTokens } : {}),
      ...(patch.monthlyTokenCap !== undefined ? { monthly_token_cap: patch.monthlyTokenCap } : {}),
      ...(patch.fallbackMessage !== undefined ? { fallback_message: patch.fallbackMessage } : {}),
      ...(createdBy ? { created_by: createdBy } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.client
      .from('arena_ai_agents')
      .upsert(payload, { onConflict: 'arena_id' })
      .select('*')
      .single()

    if (error) throw new Error(`SupabaseAgentRepository.upsert: ${error.message}`)
    return toDomain(data)
  }

  async setEnabled(arenaId: string, enabled: boolean): Promise<AgentConfig> {
    const { data, error } = await this.client
      .from('arena_ai_agents')
      .upsert(
        {
          arena_id: arenaId,
          enabled,
          status: enabled ? 'active' : 'paused',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'arena_id' }
      )
      .select('*')
      .single()

    if (error) throw new Error(`SupabaseAgentRepository.setEnabled: ${error.message}`)
    return toDomain(data)
  }
}
