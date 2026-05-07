import type { Database } from '@/types/supabase.types';

type Row = Database['public']['Tables']['bookings']['Row'];

export type CreateBookingDTO = Database['public']['Tables']['bookings']['Insert'];
export type UpdateBookingDTO = Database['public']['Tables']['bookings']['Update'];

export type Booking = Row & {
  courts?: { id: string; name: string } | null
  sports?: { id: string; name: string } | null
  atleta?: { id: string; nome_perfil: string; telefone: string } | null
  booking_services?: BookingServiceEmbed[] | null
}

export type BookingServiceEmbed = {
  id: string
  booking_id: string
  product_id: string
  quantity: number
  unit_price: number
  products?: { id: string; name: string } | null
}

export type PlanoMensalista = Database['public']['Tables']['planos_mensalista']['Row'];
export type CreatePlanoMensalistaDTO = Database['public']['Tables']['planos_mensalista']['Insert'];

export interface PlanoMensalistaComDetalhes extends PlanoMensalista {
  atleta: { id: string; nome_perfil: string; telefone: string | null } | null;
  sports: { id: string; name: string } | null;
  court: { id: string; name: string } | null;
  proximo_mes_reservado: string | null;
}
