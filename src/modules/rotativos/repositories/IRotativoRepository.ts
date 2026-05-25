import type {
  Rotativo,
  RotativoInscricao,
  CreateRotativoDTO,
  MonthCalendarEntry,
  RotativoListFilters,
  RotativoPacote,
  RotativoCreditoMovimento,
  RotativoCreditoSaldo,
  CourtOption,
} from '../types/rotativo.types';

export interface IRotativoRepository {
  create(data: CreateRotativoDTO, courtIds: string[]): Promise<Rotativo>;
  update(rotativoId: string, data: Partial<CreateRotativoDTO>, courtIds: string[]): Promise<Rotativo>;
  setStatus(rotativoId: string, status: 'ativo' | 'desativado'): Promise<void>;
  findById(rotativoId: string): Promise<Rotativo | null>;
  findByDate(arenaId: string, date: string): Promise<Rotativo[]>;
  list(arenaId: string, filters?: RotativoListFilters): Promise<{ rows: Rotativo[]; total: number }>;
  findByMonth(arenaId: string, startDate: string, endDate: string): Promise<Record<string, MonthCalendarEntry>>;
  getInscritos(rotativoId: string): Promise<RotativoInscricao[]>;
  registerAthlete(
    rotativoId: string,
    athleteId: string,
    valuePaid: number,
    options?: {
      tipo_pagamento: 'credito' | 'avulso';
      modo_pagamento_id?: string | null;
      observacao?: string | null;
    }
  ): Promise<RotativoInscricao>;
  getCourts(arenaId: string): Promise<CourtOption[]>;
  getPacotes(arenaId: string): Promise<RotativoPacote[]>;
  savePacotes(arenaId: string, pacotes: { quantidade: number; valor_reais: number }[]): Promise<RotativoPacote[]>;
  launchCredit(
    arenaId: string,
    athleteId: string,
    quantidade: number,
    validityDays: number,
    createdBy: string | null,
    payment?: { valor_pago: number; modo_pagamento_id: string }
  ): Promise<{ loteId: string; movimentoId: string }>;
  consumeCredit(arenaId: string, athleteId: string, inscricaoId: string, createdBy: string | null): Promise<void>;
  getCreditMovements(arenaId: string, filters?: { search?: string; page?: number; pageSize?: number }): Promise<{ rows: RotativoCreditoMovimento[]; total: number }>;
  getTopAthletesByCredit(arenaId: string, limit?: number): Promise<RotativoCreditoSaldo[]>;
  getAthleteCreditBalance(arenaId: string, athleteId: string): Promise<number>;
  processExpiredCredits(arenaId: string): Promise<number>;
}
