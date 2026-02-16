import { supabase } from "@/shared/database/supabaseClient";

export interface StationCustomer {
    id: string;
    arena_id: string;
    name: string;
    cpf?: string;
    phone?: string;
    email?: string;
    created_at: string;
}

export interface StationCustomerInput {
    arena_id: string;
    name: string;
    cpf?: string;
    phone?: string;
    email?: string;
}

export class CustomerService {
    static async getCustomersByArena(arenaId: string) {
        const { data, error } = await supabase
            .from('station_customers')
            .select('*')
            .eq('arena_id', arenaId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching station customers:', error);
            throw error;
        }

        return data as StationCustomer[];
    }

    static async createCustomer(input: StationCustomerInput) {
        const { data, error } = await supabase
            .from('station_customers')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error('Error creating station customer:', error);
            throw error;
        }

        return data as StationCustomer;
    }
}
