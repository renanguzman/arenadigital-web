import { supabase } from "@/shared/database/supabaseClient";

export interface BookingInput {
    arena_id: string;
    court_id: string;
    athlete_name: string;
    athlete_id?: string;
    sport_id?: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled' | 'pending';
    price?: number;
    recurrence_id?: string;
}

export class BookingService {
    static async createBooking(input: BookingInput) {
        const { data, error } = await supabase
            .from('bookings')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error('Error creating booking details:', error);
            throw error;
        }

        return data;
    }

    static async createRecurringBookings(inputs: BookingInput[]) {
        const { data, error } = await supabase
            .from('bookings')
            .insert(inputs)
            .select();

        if (error) {
            console.error('Error creating recurring bookings:', error);
            throw error;
        }

        return data;
    }

    static async getBookingsByArena(arenaId: string, startDate?: string, endDate?: string) {
        let query = supabase
            .from('bookings')
            .select('*, courts(name)')
            .eq('arena_id', arenaId);

        if (startDate) query = query.gte('start_time', startDate);
        if (endDate) query = query.lte('end_time', endDate);

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching bookings:', error);
            throw error;
        }

        return data;
    }

    static async getBookingsByCourt(courtId: string, startDate?: string, endDate?: string) {
        let query = supabase
            .from('bookings')
            .select('*, courts(name), sports(name), atleta:athlete_id(id, nome_perfil, telefone)')
            .eq('court_id', courtId);

        if (startDate) query = query.gte('start_time', startDate);
        if (endDate) query = query.lte('end_time', endDate);

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching bookings by court:', error);
            throw error;
        }

        return data;
    }

    static async getBookingsByArenaWithSports(arenaId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, courts(id, name), sports(id, name), atleta:athlete_id(id, nome_perfil, telefone)')
            .eq('arena_id', arenaId)
            .gte('start_time', startDate)
            .lte('end_time', endDate)
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching bookings by arena with sports:', error);
            throw error;
        }

        return data;
    }

    static async updateBookingStatus(id: string, status: 'confirmed' | 'cancelled') {
        const { data, error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating booking:', error);
            throw error;
        }

        return data;
    }
}
