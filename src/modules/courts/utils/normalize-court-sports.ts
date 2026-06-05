import type { Json } from "@/types/supabase.types"

export interface CourtSportOption {
  id: string
  name: string
}

export interface CourtSportRelation {
  sport: CourtSportOption | null
}

export interface CourtWithSportRelations {
  id: string
  name: string
  day_config: Json | null
  booking_type: string | null
  price: number | null
  sports?: CourtSportRelation[] | null
}

export type CourtWithSports<TCourt extends CourtWithSportRelations = CourtWithSportRelations> =
  Omit<TCourt, "sports"> & {
    sports: CourtSportOption[]
  }

export function normalizeCourtSports<TCourt extends CourtWithSportRelations>(
  court: TCourt
): CourtWithSports<TCourt> {
  return {
    ...court,
    sports: (court.sports ?? []).flatMap((relation) =>
      relation.sport ? [relation.sport] : []
    ),
  }
}
