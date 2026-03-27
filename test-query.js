const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vsehlxyowqqhakbjiznv.supabase.co';
const supabaseKey = 'sb_publishable_n25ShJhBh1rvMEjhsmwXew_qCSZbNZj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('station_orders')
        .select(`
            id,
            station:stations(
                name,
                station_type:station_types(name)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) console.error("ERR:", error);
    else console.log(JSON.stringify(data, null, 2));
}
run();
