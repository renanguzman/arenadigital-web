export interface ArenaPromotionInput {
  id?: string
  arena_id: string
  court_id?: string | null
  sport_id?: string | null
  title: string
  description?: string | null
  image_url?: string | null
  price?: number | null
  original_price?: number | null
  starts_at?: string
  ends_at?: string | null
  weekday?: number | null
  start_time?: string | null
  end_time?: string | null
  active?: boolean
  priority?: number
}

export interface MobileContentOption {
  id: string
  name: string
}

export interface MobilePromotion {
  id: string
  arena_id: string
  court_id: string | null
  sport_id: string | null
  title: string
  description: string | null
  image_url: string | null
  price: number | null
  original_price: number | null
  starts_at: string
  ends_at: string | null
  weekday: number | null
  start_time: string | null
  end_time: string | null
  active: boolean
  priority: number
  created_at: string
  arenas?: MobileContentOption | null
  courts?: MobileContentOption | null
  sports?: MobileContentOption | null
}

export interface ArenaHighlightInput {
  id?: string
  arena_id: string
  title: string
  description?: string | null
  image_url?: string | null
  starts_at?: string
  ends_at?: string | null
  city_id?: number | null
  sport_id?: string | null
  active?: boolean
  priority?: number
}

export interface MobileHighlight {
  id: string
  arena_id: string
  title: string
  description: string | null
  image_url: string | null
  starts_at: string
  ends_at: string | null
  city_id: number | null
  sport_id: string | null
  active: boolean
  priority: number
  created_at: string
  arenas?: MobileContentOption | null
  sports?: MobileContentOption | null
  municipios?: { codigo_ibge: number; nome: string } | null
}

export interface OpenGameInput {
  id?: string
  booking_id?: string | null
  arena_id: string
  sport_id: string
  owner_atleta_id: string
  date: string
  start_time: string
  end_time: string
  needed_players?: number
  current_players?: number
  level_min_id?: string | null
  level_max_id?: string | null
  status?: 'open' | 'full' | 'cancelled' | 'finished'
  visibility?: 'public' | 'connections' | 'team'
  notes?: string | null
}

export interface MobileOpenGame {
  id: string
  booking_id: string | null
  arena_id: string
  sport_id: string
  owner_atleta_id: string
  date: string
  start_time: string
  end_time: string
  needed_players: number
  current_players: number
  level_min_id: string | null
  level_max_id: string | null
  status: 'open' | 'full' | 'cancelled' | 'finished'
  visibility: 'public' | 'connections' | 'team'
  notes: string | null
  created_at: string
  arenas?: MobileContentOption | null
  sports?: MobileContentOption | null
  atleta?: MobileContentOption | null
}

export type MobileContentResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data: T; error: string }
