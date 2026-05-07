/** Aba da tela da arena (cards vs. tabela de cadastros). */
export type ArenaDashboardTab = 'espacos' | 'cadastro'

export function parseArenaDashboardTab(tab: string | undefined): ArenaDashboardTab {
    return tab === 'cadastro' ? 'cadastro' : 'espacos'
}

export function parseReturnTabParam(value: string | undefined): ArenaDashboardTab {
    return value === 'cadastro' ? 'cadastro' : 'espacos'
}

/** Rota da arena com a aba correta na query (cadastro usa `?tab=cadastro`). */
export function arenaDashboardPath(arenaId: string, tab: ArenaDashboardTab): string {
    return tab === 'cadastro'
        ? `/dashboard/arenas/${arenaId}?tab=cadastro`
        : `/dashboard/arenas/${arenaId}`
}

export function spaceEditPath(arenaId: string, spaceId: string, returnTab: ArenaDashboardTab): string {
    const q = returnTab === 'cadastro' ? '?returnTab=cadastro' : '?returnTab=espacos'
    return `/dashboard/arenas/${arenaId}/spaces/${spaceId}/edit${q}`
}

export function spaceNewPath(arenaId: string): string {
    return `/dashboard/arenas/${arenaId}/spaces/new`
}
