export type { Database, Json } from './supabase.types';

// Convenience row types — use these instead of querying the DB type manually
import type { Database } from './supabase.types';

type Tables = Database['public']['Tables'];

export type ArenaRow              = Tables['arenas']['Row'];
export type ArenaInsert           = Tables['arenas']['Insert'];
export type ArenaUpdate           = Tables['arenas']['Update'];

export type UserRow               = Tables['users']['Row'];
export type UserInsert             = Tables['users']['Insert'];

export type BookingRow            = Tables['bookings']['Row'];
export type BookingInsert         = Tables['bookings']['Insert'];
export type BookingUpdate         = Tables['bookings']['Update'];

export type TransactionRow        = Tables['transactions']['Row'];
export type TransactionInsert     = Tables['transactions']['Insert'];
export type TransactionUpdate     = Tables['transactions']['Update'];

export type AtletaRow             = Tables['atleta']['Row'];
export type AtletaInsert          = Tables['atleta']['Insert'];

export type CourtRow              = Tables['courts']['Row'];
export type CourtInsert           = Tables['courts']['Insert'];

export type StationRow            = Tables['stations']['Row'];
export type StationInsert         = Tables['stations']['Insert'];

export type ProductRow            = Tables['products']['Row'];
export type ProductInsert         = Tables['products']['Insert'];

export type SportRow              = Tables['sports']['Row'];
export type ComodidadeRow         = Tables['comodidades']['Row'];

export type RotativoRow           = Tables['rotativos']['Row'];
export type RotativoInsert        = Tables['rotativos']['Insert'];

export type LoyaltyRow            = Tables['programa_fidelidade_extrato']['Row'];
export type LoyaltyInsert         = Tables['programa_fidelidade_extrato']['Insert'];

export type ArenaSubscriptionRow  = Tables['arena_subscriptions']['Row'];
