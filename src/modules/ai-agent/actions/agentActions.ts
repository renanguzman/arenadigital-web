"use server"

import { revalidatePath } from 'next/cache'
import { assertArenaBackofficeAccess, requireAuthenticatedDbUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/modules/audit/audit-log.service'
import { SupabaseAgentRepository } from '../repositories/SupabaseAgentRepository'
import { SupabaseWhatsAppChannelRepository } from '../repositories/SupabaseWhatsAppChannelRepository'
import { agentConfigSchema, connectChannelSchema } from '../schemas/agent-config.schema'
import {
  DEFAULT_AGENT_MODEL,
  type AgentConfig,
  type WhatsAppChannelPublic,
} from '../types/agent.types'

export interface AgentSettings {
  agent: AgentConfig
  channel: WhatsAppChannelPublic | null
}

function defaultAgent(arenaId: string): AgentConfig {
  return {
    arenaId,
    enabled: false,
    personaPrompt: null,
    model: DEFAULT_AGENT_MODEL,
    temperature: 0.3,
    maxOutputTokens: 500,
    monthlyTokenCap: null,
    fallbackMessage: null,
    status: 'draft',
    updatedAt: null,
  }
}

function revalidateArena(arenaId: string) {
  revalidatePath(`/dashboard/arenas/${arenaId}/edit`)
}

export async function getAgentSettingsAction(
  arenaId: string
): Promise<{ success: boolean; data: AgentSettings; error?: string }> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin()
    const agentRepo = new SupabaseAgentRepository(supabase)
    const channelRepo = new SupabaseWhatsAppChannelRepository(supabase)

    const [agent, channel] = await Promise.all([
      agentRepo.getByArenaId(arenaId),
      channelRepo.getPublicByArenaId(arenaId),
    ])

    return {
      success: true,
      data: { agent: agent ?? defaultAgent(arenaId), channel },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar o agente'
    return { success: false, data: { agent: defaultAgent(arenaId), channel: null }, error: message }
  }
}

export async function updateAgentConfigAction(
  arenaId: string,
  input: unknown
): Promise<{ success: boolean; data?: AgentConfig; error?: string }> {
  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const parsed = agentConfigSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const agent = await new SupabaseAgentRepository(getSupabaseAdmin()).upsert(
      arenaId,
      {
        personaPrompt: parsed.data.personaPrompt ?? null,
        model: parsed.data.model,
        temperature: parsed.data.temperature,
        maxOutputTokens: parsed.data.maxOutputTokens,
        monthlyTokenCap: parsed.data.monthlyTokenCap ?? null,
        fallbackMessage: parsed.data.fallbackMessage ?? null,
      },
      dbUserId
    )

    revalidateArena(arenaId)
    return { success: true, data: agent }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar a configuração do agente'
    return { success: false, error: message }
  }
}

export async function toggleAgentAction(
  arenaId: string,
  enabled: boolean
): Promise<{ success: boolean; data?: AgentConfig; error?: string }> {
  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const supabase = getSupabaseAdmin()
    const channelRepo = new SupabaseWhatsAppChannelRepository(supabase)

    if (enabled) {
      const channel = await channelRepo.getPublicByArenaId(arenaId)
      if (!channel || channel.status !== 'connected') {
        throw new Error('Conecte um número de WhatsApp antes de ativar o agente.')
      }
    }

    const agent = await new SupabaseAgentRepository(supabase).setEnabled(arenaId, enabled)

    await logAuditEvent({
      entityType: 'arena_ai_agent',
      entityId: arenaId,
      action: enabled ? 'agent.enabled' : 'agent.disabled',
      actorId: dbUserId,
      actorType: 'user',
      newValue: { enabled },
    })

    revalidateArena(arenaId)
    return { success: true, data: agent }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao alterar o status do agente'
    return { success: false, error: message }
  }
}

export async function connectChannelAction(
  input: unknown
): Promise<{ success: boolean; data?: WhatsAppChannelPublic; error?: string }> {
  try {
    const parsed = connectChannelSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Dados de conexão inválidos')
    }

    const { dbUserId } = await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(parsed.data.arenaId)

    const channel = await new SupabaseWhatsAppChannelRepository(getSupabaseAdmin()).connect({
      arenaId: parsed.data.arenaId,
      phoneNumberId: parsed.data.phoneNumberId,
      wabaId: parsed.data.wabaId,
      displayPhoneNumber: parsed.data.displayPhoneNumber ?? null,
      verifiedName: parsed.data.verifiedName ?? null,
      accessToken: parsed.data.accessToken,
      tokenExpiresAt: parsed.data.tokenExpiresAt ?? null,
    })

    await logAuditEvent({
      entityType: 'arena_ai_agent',
      entityId: parsed.data.arenaId,
      action: 'agent.channel_connected',
      actorId: dbUserId,
      actorType: 'user',
      newValue: {
        phone_number_id: channel.phoneNumberId,
        waba_id: channel.wabaId,
        display_phone_number: channel.displayPhoneNumber,
      },
    })

    revalidateArena(parsed.data.arenaId)
    return { success: true, data: channel }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao conectar o número de WhatsApp'
    return { success: false, error: message }
  }
}

export async function disconnectChannelAction(
  arenaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const supabase = getSupabaseAdmin()
    await new SupabaseWhatsAppChannelRepository(supabase).disconnect(arenaId)
    // Desligar o agente ao desconectar o número (não há canal para responder).
    await new SupabaseAgentRepository(supabase).setEnabled(arenaId, false)

    await logAuditEvent({
      entityType: 'arena_ai_agent',
      entityId: arenaId,
      action: 'agent.channel_disconnected',
      actorId: dbUserId,
      actorType: 'user',
    })

    revalidateArena(arenaId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao desconectar o número'
    return { success: false, error: message }
  }
}
