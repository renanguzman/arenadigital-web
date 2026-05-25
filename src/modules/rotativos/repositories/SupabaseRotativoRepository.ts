import type { SupabaseClient } from '@supabase/supabase-js';
import type { IRotativoRepository } from './IRotativoRepository';
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

const ROTATIVO_SELECT = `
  *,
  esporte:id_esporte(name),
  rotativo_courts(court:courts(id, name))
` as const;

function mapRotativo(row: Record<string, unknown>): Rotativo {
  const courts = (row.rotativo_courts as Array<{ court: { id: string; name: string } | null }> | null)
    ?.map((rc) => rc.court)
    .filter((c): c is { id: string; name: string } => Boolean(c)) ?? [];

  const { rotativo_courts: _, ...rest } = row;
  return { ...rest, courts } as unknown as Rotativo;
}

async function attachInscricoesCount(client: SupabaseClient, rows: Rotativo[]): Promise<Rotativo[]> {
  return Promise.all(
    rows.map(async (r) => {
      const { count } = await client
        .from('rotativo_inscricoes')
        .select('*', { count: 'exact', head: true })
        .eq('id_rotativo', r.id);
      return { ...r, inscricoes_count: count ?? 0 };
    })
  );
}

export class SupabaseRotativoRepository implements IRotativoRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async syncCourts(rotativoId: string, courtIds: string[]) {
    await this.client.from('rotativo_courts').delete().eq('rotativo_id', rotativoId);
    if (courtIds.length === 0) return;
    const { error } = await this.client
      .from('rotativo_courts')
      .insert(courtIds.map((court_id) => ({ rotativo_id: rotativoId, court_id })));
    if (error) throw new Error(`SupabaseRotativoRepository.syncCourts: ${error.message}`);
  }

  async create(data: CreateRotativoDTO, courtIds: string[]): Promise<Rotativo> {
    const { data: row, error } = await this.client
      .from('rotativos')
      .insert({ ...data, status: data.status ?? 'ativo' })
      .select(ROTATIVO_SELECT)
      .single();

    if (error) throw new Error(`SupabaseRotativoRepository.create: ${error.message}`);
    await this.syncCourts(row.id, courtIds);
    const refreshed = await this.findById(row.id);
    return refreshed ?? mapRotativo(row);
  }

  async update(rotativoId: string, data: Partial<CreateRotativoDTO>, courtIds: string[]): Promise<Rotativo> {
    const { error } = await this.client.from('rotativos').update(data).eq('id', rotativoId);
    if (error) throw new Error(`SupabaseRotativoRepository.update: ${error.message}`);
    await this.syncCourts(rotativoId, courtIds);
    const refreshed = await this.findById(rotativoId);
    if (!refreshed) throw new Error('Rotativo não encontrado após atualização');
    return refreshed;
  }

  async setStatus(rotativoId: string, status: 'ativo' | 'desativado'): Promise<void> {
    const { error } = await this.client.from('rotativos').update({ status }).eq('id', rotativoId);
    if (error) throw new Error(`SupabaseRotativoRepository.setStatus: ${error.message}`);
  }

  async findById(rotativoId: string): Promise<Rotativo | null> {
    const { data, error } = await this.client
      .from('rotativos')
      .select(ROTATIVO_SELECT)
      .eq('id', rotativoId)
      .maybeSingle();

    if (error) throw new Error(`SupabaseRotativoRepository.findById: ${error.message}`);
    if (!data) return null;

    const [mapped] = await attachInscricoesCount(this.client, [mapRotativo(data)]);
    return mapped;
  }

  async findByDate(arenaId: string, date: string): Promise<Rotativo[]> {
    const { data, error } = await this.client
      .from('rotativos')
      .select(ROTATIVO_SELECT)
      .eq('id_arena', arenaId)
      .eq('data', date)
      .order('hora_inicio', { ascending: true });

    if (error) throw new Error(`SupabaseRotativoRepository.findByDate: ${error.message}`);
    const mapped = (data ?? []).map(mapRotativo);
    return attachInscricoesCount(this.client, mapped);
  }

  async list(arenaId: string, filters: RotativoListFilters = {}): Promise<{ rows: Rotativo[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from('rotativos')
      .select(ROTATIVO_SELECT, { count: 'exact' })
      .eq('id_arena', arenaId)
      .order('data', { ascending: false })
      .order('hora_inicio', { ascending: false });

    if (filters.status && filters.status !== 'todos') {
      query = query.eq('status', filters.status);
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      const { data: arenaAthletes } = await this.client
        .from('arenas_atleta')
        .select('id_atleta')
        .eq('id_arena', arenaId);

      const arenaAthleteIds = (arenaAthletes ?? []).map((a) => a.id_atleta);
      if (arenaAthleteIds.length === 0) return { rows: [], total: 0 };

      const { data: matchingAthletes } = await this.client
        .from('atleta')
        .select('id')
        .in('id', arenaAthleteIds)
        .ilike('nome_perfil', `%${term}%`);

      const athleteIds = (matchingAthletes ?? []).map((a) => a.id);
      if (athleteIds.length === 0) return { rows: [], total: 0 };

      const { data: inscricaoMatches } = await this.client
        .from('rotativo_inscricoes')
        .select('id_rotativo')
        .in('id_atleta', athleteIds);

      const rotativoIds = [
        ...new Set((inscricaoMatches ?? []).map((i) => i.id_rotativo)),
      ];

      if (rotativoIds.length === 0) return { rows: [], total: 0 };
      query = query.in('id', rotativoIds);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(`SupabaseRotativoRepository.list: ${error.message}`);

    const mapped = (data ?? []).map(mapRotativo);
    const rows = await attachInscricoesCount(this.client, mapped);
    return { rows, total: count ?? 0 };
  }

  async findByMonth(arenaId: string, startDate: string, endDate: string): Promise<Record<string, MonthCalendarEntry>> {
    const { data, error } = await this.client
      .from('rotativos')
      .select('id, data')
      .eq('id_arena', arenaId)
      .gte('data', startDate)
      .lte('data', endDate);

    if (error) throw new Error(`SupabaseRotativoRepository.findByMonth: ${error.message}`);

    const results = await Promise.all(
      (data ?? []).map(async (r) => {
        const { count } = await this.client
          .from('rotativo_inscricoes')
          .select('*', { count: 'exact', head: true })
          .eq('id_rotativo', r.id);
        return { data: r.data, inscricoes_count: count ?? 0 };
      })
    );

    const byDate: Record<string, MonthCalendarEntry> = {};
    for (const r of results) {
      if (!byDate[r.data]) byDate[r.data] = { hasRotativo: true, hasInscriptions: false };
      if (r.inscricoes_count > 0) byDate[r.data].hasInscriptions = true;
    }
    return byDate;
  }

  async getInscritos(rotativoId: string): Promise<RotativoInscricao[]> {
    const { data, error } = await this.client
      .from('rotativo_inscricoes')
      .select('*, atleta:id_atleta(nome_perfil), modo_pagamento:modo_pagamento_id(nome)')
      .eq('id_rotativo', rotativoId)
      .order('data_inscricao', { ascending: true });

    if (error) throw new Error(`SupabaseRotativoRepository.getInscritos: ${error.message}`);
    return (data ?? []) as unknown as RotativoInscricao[];
  }

  async registerAthlete(
    rotativoId: string,
    athleteId: string,
    valuePaid: number,
    options?: {
      tipo_pagamento: 'credito' | 'avulso';
      modo_pagamento_id?: string | null;
      observacao?: string | null;
    }
  ): Promise<RotativoInscricao> {
    const { data: rotativo, error: rotativoError } = await this.client
      .from('rotativos')
      .select('limitado, limite_participantes, status, valor, id_arena')
      .eq('id', rotativoId)
      .single();

    if (rotativoError) throw new Error(`SupabaseRotativoRepository.registerAthlete (fetch): ${rotativoError.message}`);
    if (rotativo.status === 'desativado') throw new Error('Este rotativo está desativado.');

    if (rotativo.limitado) {
      const { count, error: countError } = await this.client
        .from('rotativo_inscricoes')
        .select('*', { count: 'exact', head: true })
        .eq('id_rotativo', rotativoId);

      if (countError) throw new Error(`SupabaseRotativoRepository.registerAthlete (count): ${countError.message}`);
      if (count !== null && count >= (rotativo.limite_participantes ?? 0)) {
        throw new Error('Limite de participantes atingido.');
      }
    }

    const { data, error } = await this.client
      .from('rotativo_inscricoes')
      .insert({
        id_rotativo: rotativoId,
        id_atleta: athleteId,
        valor_pago: valuePaid,
        status_pagamento: 'pago',
        tipo_pagamento: options?.tipo_pagamento ?? 'avulso',
        modo_pagamento_id: options?.modo_pagamento_id ?? null,
        observacao: options?.observacao ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Atleta já inscrito nesta sessão.');
      throw new Error(`SupabaseRotativoRepository.registerAthlete: ${error.message}`);
    }

    return data as unknown as RotativoInscricao;
  }

  async getCourts(arenaId: string): Promise<CourtOption[]> {
    const { data, error } = await this.client
      .from('courts')
      .select('id, name')
      .eq('arena_id', arenaId)
      .order('name');

    if (error) throw new Error(`SupabaseRotativoRepository.getCourts: ${error.message}`);
    return data ?? [];
  }

  async getPacotes(arenaId: string): Promise<RotativoPacote[]> {
    const { data, error } = await this.client
      .from('rotativo_pacotes')
      .select('*')
      .eq('arena_id', arenaId)
      .order('ordem', { ascending: true });

    if (error) throw new Error(`SupabaseRotativoRepository.getPacotes: ${error.message}`);
    return (data ?? []) as RotativoPacote[];
  }

  async savePacotes(arenaId: string, pacotes: { quantidade: number; valor_reais: number }[]): Promise<RotativoPacote[]> {
    await this.client.from('rotativo_pacotes').delete().eq('arena_id', arenaId);

    if (pacotes.length === 0) return [];

    const { data, error } = await this.client
      .from('rotativo_pacotes')
      .insert(
        pacotes.map((p, index) => ({
          arena_id: arenaId,
          quantidade: p.quantidade,
          valor_reais: p.valor_reais,
          ordem: index,
        }))
      )
      .select('*');

    if (error) throw new Error(`SupabaseRotativoRepository.savePacotes: ${error.message}`);
    return (data ?? []) as RotativoPacote[];
  }

  async launchCredit(
    arenaId: string,
    athleteId: string,
    quantidade: number,
    validityDays: number,
    createdBy: string | null,
    payment?: { valor_pago: number; modo_pagamento_id: string }
  ): Promise<{ loteId: string; movimentoId: string }> {
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + validityDays);
    const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];

    const { data: lote, error: loteError } = await this.client
      .from('rotativo_credito_lotes')
      .insert({
        arena_id: arenaId,
        atleta_id: athleteId,
        quantidade_inicial: quantidade,
        quantidade_restante: quantidade,
        data_vencimento: dataVencimentoStr,
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (loteError) throw new Error(`SupabaseRotativoRepository.launchCredit: ${loteError.message}`);

    const { data: movimento, error: movError } = await this.client
      .from('rotativo_credito_movimentos')
      .insert({
        arena_id: arenaId,
        atleta_id: athleteId,
        tipo: 'compra',
        quantidade,
        lote_id: lote.id,
        created_by: createdBy,
        valor_pago: payment?.valor_pago ?? null,
        modo_pagamento_id: payment?.modo_pagamento_id ?? null,
      })
      .select('id')
      .single();

    if (movError) throw new Error(`SupabaseRotativoRepository.launchCredit (mov): ${movError.message}`);

    return { loteId: lote.id, movimentoId: movimento.id };
  }

  async consumeCredit(
    arenaId: string,
    athleteId: string,
    inscricaoId: string,
    createdBy: string | null
  ): Promise<void> {
    const { data: lotes, error: lotesError } = await this.client
      .from('rotativo_credito_lotes')
      .select('id, quantidade_restante')
      .eq('arena_id', arenaId)
      .eq('atleta_id', athleteId)
      .gt('quantidade_restante', 0)
      .gte('data_vencimento', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: true });

    if (lotesError) throw new Error(`SupabaseRotativoRepository.consumeCredit: ${lotesError.message}`);
    if (!lotes?.length) throw new Error('Atleta não possui créditos disponíveis.');

    const lote = lotes[0];
    const { error: updateError } = await this.client
      .from('rotativo_credito_lotes')
      .update({ quantidade_restante: lote.quantidade_restante - 1 })
      .eq('id', lote.id);

    if (updateError) throw new Error(`SupabaseRotativoRepository.consumeCredit (update): ${updateError.message}`);

    const { error: movError } = await this.client.from('rotativo_credito_movimentos').insert({
      arena_id: arenaId,
      atleta_id: athleteId,
      tipo: 'uso',
      quantidade: -1,
      lote_id: lote.id,
      inscricao_id: inscricaoId,
      created_by: createdBy,
    });

    if (movError) throw new Error(`SupabaseRotativoRepository.consumeCredit (mov): ${movError.message}`);
  }

  async getCreditMovements(
    arenaId: string,
    filters: { search?: string; page?: number; pageSize?: number } = {}
  ): Promise<{ rows: RotativoCreditoMovimento[]; total: number }> {
    await this.processExpiredCredits(arenaId);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from('rotativo_credito_movimentos')
      .select('*', { count: 'exact' })
      .eq('arena_id', arenaId)
      .order('created_at', { ascending: false });

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      const { data: arenaAthletes } = await this.client
        .from('arenas_atleta')
        .select('id_atleta')
        .eq('id_arena', arenaId);

      const arenaAthleteIds = (arenaAthletes ?? []).map((a) => a.id_atleta);
      if (arenaAthleteIds.length === 0) return { rows: [], total: 0 };

      const { data: matchingAthletes } = await this.client
        .from('atleta')
        .select('id')
        .in('id', arenaAthleteIds)
        .ilike('nome_perfil', `%${term}%`);

      const athleteIds = (matchingAthletes ?? []).map((a) => a.id);
      if (athleteIds.length === 0) return { rows: [], total: 0 };
      query = query.in('atleta_id', athleteIds);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(`SupabaseRotativoRepository.getCreditMovements: ${error.message}`);

    const rows = (data ?? []) as Array<{
      id: string;
      arena_id: string;
      atleta_id: string;
      tipo: 'compra' | 'uso' | 'vencimento';
      quantidade: number;
      lote_id: string | null;
      inscricao_id: string | null;
      created_at: string;
    }>;

    if (rows.length === 0) return { rows: [], total: count ?? 0 };

    const athleteIds = [...new Set(rows.map((r) => r.atleta_id))];
    const loteIds = [...new Set(rows.map((r) => r.lote_id).filter((id): id is string => Boolean(id)))];

    const [{ data: atletas }, { data: lotes }] = await Promise.all([
      this.client.from('atleta').select('id, nome_perfil').in('id', athleteIds),
      loteIds.length > 0
        ? this.client.from('rotativo_credito_lotes').select('id, data_vencimento').in('id', loteIds)
        : Promise.resolve({ data: [] as { id: string; data_vencimento: string }[] }),
    ]);

    const atletaMap = new Map((atletas ?? []).map((a) => [a.id, a]));
    const loteMap = new Map((lotes ?? []).map((l) => [l.id, l]));

    return {
      rows: rows.map((row) => ({
        ...row,
        atleta: atletaMap.get(row.atleta_id) ?? null,
        lote: row.lote_id ? loteMap.get(row.lote_id) ?? null : null,
      })) as unknown as RotativoCreditoMovimento[],
      total: count ?? 0,
    };
  }

  async getTopAthletesByCredit(arenaId: string, limit = 5): Promise<RotativoCreditoSaldo[]> {
    await this.processExpiredCredits(arenaId);

    const { data: saldos, error } = await this.client
      .from('rotativo_credito_saldo')
      .select('arena_id, atleta_id, saldo')
      .eq('arena_id', arenaId)
      .gt('saldo', 0)
      .order('saldo', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`SupabaseRotativoRepository.getTopAthletesByCredit: ${error.message}`);
    if (!saldos?.length) return [];

    const athleteIds = saldos.map((s) => s.atleta_id);
    const { data: atletas } = await this.client
      .from('atleta')
      .select('id, nome_perfil')
      .in('id', athleteIds);

    const atletaMap = new Map((atletas ?? []).map((a) => [a.id, a]));

    return saldos.map((s) => ({
      ...s,
      atleta: atletaMap.get(s.atleta_id) ?? null,
    })) as RotativoCreditoSaldo[];
  }

  async getAthleteCreditBalance(arenaId: string, athleteId: string): Promise<number> {
    await this.processExpiredCredits(arenaId);

    const { data, error } = await this.client
      .from('rotativo_credito_saldo')
      .select('saldo')
      .eq('arena_id', arenaId)
      .eq('atleta_id', athleteId)
      .maybeSingle();

    if (error) throw new Error(`SupabaseRotativoRepository.getAthleteCreditBalance: ${error.message}`);
    return data?.saldo ?? 0;
  }

  async processExpiredCredits(arenaId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data: expiredLotes, error } = await this.client
      .from('rotativo_credito_lotes')
      .select('id, atleta_id, quantidade_restante')
      .eq('arena_id', arenaId)
      .lt('data_vencimento', today)
      .gt('quantidade_restante', 0);

    if (error) throw new Error(`SupabaseRotativoRepository.processExpiredCredits: ${error.message}`);
    if (!expiredLotes?.length) return 0;

    let processed = 0;
    for (const lote of expiredLotes) {
      const qty = lote.quantidade_restante;
      const { error: updateError } = await this.client
        .from('rotativo_credito_lotes')
        .update({ quantidade_restante: 0 })
        .eq('id', lote.id);

      if (updateError) {
        throw new Error(`SupabaseRotativoRepository.processExpiredCredits (update): ${updateError.message}`);
      }

      const { error: movError } = await this.client.from('rotativo_credito_movimentos').insert({
        arena_id: arenaId,
        atleta_id: lote.atleta_id,
        tipo: 'vencimento',
        quantidade: -qty,
        lote_id: lote.id,
      });

      if (movError) {
        throw new Error(`SupabaseRotativoRepository.processExpiredCredits (mov): ${movError.message}`);
      }

      processed++;
    }

    return processed;
  }
}
