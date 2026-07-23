import type { AgentConfig, UpdateAgentConfigInput } from '../types/agent.types'

export interface IAgentRepository {
  getByArenaId(arenaId: string): Promise<AgentConfig | null>
  /** Cria (se não existir) ou atualiza a configuração do agente da arena. */
  upsert(
    arenaId: string,
    patch: UpdateAgentConfigInput,
    createdBy?: string | null
  ): Promise<AgentConfig>
  /** Liga/desliga o agente. Ajusta também o status derivado. */
  setEnabled(arenaId: string, enabled: boolean): Promise<AgentConfig>
}
