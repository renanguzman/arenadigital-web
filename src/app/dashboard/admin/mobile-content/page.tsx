import { redirect } from "next/navigation"
import { assertPlatformAdminAccess } from "@/lib/server-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { AppHomeContentAdminClient } from "@/modules/mobile-content/components/AppHomeContentAdminClient"
import { listAppHomeContentAction } from "@/modules/mobile-content/actions/mobileContentActions"
import type { MobileContentOption } from "@/modules/mobile-content/types/mobile-content.types"

type CityOption = MobileContentOption & { uf?: string | null }

export default async function PlatformMobileContentPage() {
  try {
    await assertPlatformAdminAccess()
  } catch {
    redirect("/dashboard")
  }

  const supabase = getSupabaseAdmin()
  const [content, sportsRaw, citiesRaw] = await Promise.all([
    listAppHomeContentAction(),
    supabase.from("sports").select("id, name").order("name"),
    supabase
      .from("municipios")
      .select("codigo_ibge, nome, estados(uf)")
      .order("nome")
      .limit(6000),
  ])

  const sports = ((sportsRaw.data ?? []) as MobileContentOption[]).map((sport) => ({
    id: sport.id,
    name: sport.name,
  }))

  const cities = ((citiesRaw.data ?? []) as Array<{ codigo_ibge: number; nome: string; estados?: { uf?: string | null } | null }>).map((city) => ({
    id: String(city.codigo_ibge),
    name: `${city.nome}${city.estados?.uf ? `/${city.estados.uf}` : ""}`,
    uf: city.estados?.uf ?? null,
  } satisfies CityOption))

  return (
    <AppHomeContentAdminClient
      initialItems={content.success ? content.data : []}
      sports={sports}
      cities={cities}
    />
  )
}
