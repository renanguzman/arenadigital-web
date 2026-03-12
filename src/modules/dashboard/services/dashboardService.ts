import { supabase } from "@/shared/database/supabaseClient";

import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, addHours } from 'date-fns';

export class DashboardService {
    static async getOverviewStats(ownerId: string, selectedArenaId: string | "all" = "all") {
        let arenaIds: string[] = [];

        if (selectedArenaId !== "all") {
            arenaIds = [selectedArenaId];
        } else {
            // 1. Get Arena IDs for this owner
            const { data: arenas } = await supabase
                .from('arenas')
                .select('id')
                .eq('owner_id', ownerId);

            arenaIds = arenas?.map(a => a.id) || [];
        }

        if (arenaIds.length === 0) {
            return { receita: 0, receitaChange: 0, reservas: 0, quadras: 0, ativos: 0 };
        }

        // 2. Count Bookings (Today)
        const now = new Date();
        const todayStart = startOfDay(now).toISOString();
        const todayEnd = endOfDay(now).toISOString();

        const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .in('arena_id', arenaIds)
            .eq('status', 'confirmed')
            .gte('start_time', todayStart)
            .lte('start_time', todayEnd);

        // 3. Count Courts
        const { count: courtCount } = await supabase
            .from('courts')
            .select('*', { count: 'exact', head: true })
            .in('arena_id', arenaIds)
            .eq('status', 'ativo');

        // 4. Calculate Revenue (Current Month vs Previous Month)
        const currentMonthStart = startOfMonth(now).toISOString();
        const currentMonthEnd = endOfMonth(now).toISOString();

        const previousMonthDate = subMonths(now, 1);
        const previousMonthStart = startOfMonth(previousMonthDate).toISOString();
        const previousMonthEnd = endOfMonth(previousMonthDate).toISOString();

        // Fetch Current Month Revenue
        const { data: currentMonthData } = await supabase
            .from('transactions')
            .select('total_value')
            .in('arena_id', arenaIds)
            .eq('type', 'entrada')
            .gte('launch_date', currentMonthStart)
            .lte('launch_date', currentMonthEnd);

        const currentRevenue = currentMonthData?.reduce((acc, curr) => acc + Number(curr.total_value), 0) || 0;

        // Fetch Previous Month Revenue
        const { data: previousMonthData } = await supabase
            .from('transactions')
            .select('total_value')
            .in('arena_id', arenaIds)
            .eq('type', 'entrada')
            .gte('launch_date', previousMonthStart)
            .lte('launch_date', previousMonthEnd);

        const previousRevenue = previousMonthData?.reduce((acc, curr) => acc + Number(curr.total_value), 0) || 0;

        // Calculate Percentage Change
        let percentageChange = 0;
        if (previousRevenue > 0) {
            percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        } else if (currentRevenue > 0) {
            percentageChange = 100; // If previous was 0 and current is > 0, consider 100% increase (or potentially infinite, but 100 is safer for UI)
        }

        // 5. Count Active Athletes (Unique athletes with confirmed bookings this month)
        const { data: activeAthletesData } = await supabase
            .from('bookings')
            .select('athlete_id')
            .in('arena_id', arenaIds)
            .eq('status', 'confirmed')
            .gte('start_time', currentMonthStart)
            .lte('start_time', currentMonthEnd)
            .not('athlete_id', 'is', null);

        const uniqueAthletes = new Set(activeAthletesData?.map(b => b.athlete_id)).size;

        return {
            receita: currentRevenue,
            receitaChange: percentageChange,
            reservas: bookingCount || 0,
            quadras: courtCount || 0,
            ativos: uniqueAthletes
        };
    }
    static async getArenaIds(ownerId: string, selectedArenaId: string | "all") {
        if (selectedArenaId !== "all") return [selectedArenaId];
        const { data: arenas } = await supabase
            .from('arenas')
            .select('id')
            .eq('owner_id', ownerId);
        return arenas?.map(a => a.id) || [];
    }

    private static getCurrentDayName(): string {
        const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        return days[new Date().getDay()];
    }

    static async getOccupancyOverview(ownerId: string, selectedArenaId: string | "all" = "all") {
        try {
            const arenaIds = await this.getArenaIds(ownerId, selectedArenaId);
            if (arenaIds.length === 0) return [];

            const today = new Date();
            const startOfDayStr = startOfDay(today).toISOString();
            // Expande para 6h do dia seguinte para capturar o overnight (slots de 1h que cruzam a meia-noite)
            const searchLimitStr = addHours(endOfDay(today), 6).toISOString();
            const dayName = this.getCurrentDayName();

            // 1. Get all active courts for these arenas
            const { data: courts, error: courtsError } = await supabase
                .from('courts')
                .select('id, name, day_config, arena_id')
                .in('arena_id', arenaIds)
                .eq('status', 'ativo');

            if (courtsError) throw courtsError;

            // 2. Get all bookings for today for these specific courts
            const courtIds = (courts || []).map(c => c.id);
            if (courtIds.length === 0) return [];

            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('court_id, start_time, end_time')
                .in('court_id', courtIds)
                .in('status', ['confirmed', 'pending'])
                .gte('start_time', startOfDayStr)
                .lte('start_time', searchLimitStr);

            if (bookingsError) throw bookingsError;

            // 3. Process each court's occupancy
            const occupancyData = (courts || []).map(court => {
                const courtBookings = (bookings || []).filter(b => b.court_id === court.id);
                
                // Normalizing day config access
                const dayConfigs = Array.isArray(court.day_config) ? court.day_config : [];
                const configForToday = dayConfigs.find((c: any) => 
                    c.day.toLowerCase() === dayName.toLowerCase() ||
                    c.day.toLowerCase().includes(dayName.toLowerCase().split('-')[0])
                );

                if (!configForToday || !configForToday.enabled) {
                    return {
                        courtName: court.name,
                        percentage: 0,
                        booked: 0,
                        total: 0
                    };
                }

                // Calculate total possible slots based on start/end time
                const startHour = parseInt(configForToday.startTime.split(':')[0]);
                const endHour = parseInt(configForToday.endTime.split(':')[0]);
                
                // Cálculo de slots (slots de 1h). Se endHour < startHour, cruzou a meia-noite.
                const totalPossibleBookings = endHour >= startHour 
                    ? endHour - startHour 
                    : (24 - startHour) + endHour;

                // Filtrar reservas que realmente pertencem ao intervalo desta quadra hoje
                const bookedCount = courtBookings.filter(b => {
                    const bStart = new Date(b.start_time);
                    const bHour = bStart.getHours();
                    
                    if (endHour >= startHour) {
                        return bHour >= startHour && bHour < endHour;
                    } else {
                        // Caso overnight (ex: 18:00 as 02:00). Aceita slots >= 18h OU < 02h.
                        return bHour >= startHour || bHour < endHour;
                    }
                }).length;

                const percentage = totalPossibleBookings > 0 
                    ? Math.round((bookedCount / totalPossibleBookings) * 100) 
                    : 0;

                return {
                    courtName: court.name,
                    percentage: Math.min(percentage, 100),
                    booked: bookedCount,
                    total: totalPossibleBookings
                };
            });

            // Sort by name alphabetically
            return occupancyData.sort((a, b) => a.courtName.localeCompare(b.courtName));
        } catch (error) {
            console.error('Error in getOccupancyOverview:', error);
            return [];
        }
    }
}
