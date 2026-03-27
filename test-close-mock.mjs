import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vsehlxyowqqhakbjiznv.supabase.co', 'sb_publishable_n25ShJhBh1rvMEjhsmwXew_qCSZbNZj');

async function getOrderById(id: string) {
    const { data, error } = await supabase
        .from('station_orders')
        .select(`
            *,
            atleta:atleta(nome_perfil),
            station_customer:station_customers(name),
            station:stations(
                name,
                station_type:station_types(name)
            ),
            station_order_items(
                *,
                product:products(name)
            ),
            station_payments(*)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

async function run() {
    const order = await getOrderById('69180a2d-0782-4c8b-ab07-98a4eaca8b6c');
    const stationTypeName = (order as any).station?.station_type?.name || 'Bar';
    console.log("stationTypeName resolved to:", stationTypeName);
}
run();
