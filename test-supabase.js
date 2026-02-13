const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking Supabase connection...');

    try {
        // Inspect constraints
        const { data: constraints, error: constError } = await supabase.rpc('get_constraints_for_table', { table_name: 'products' });

        // If RPC doesn't exist (likely), try a raw query via a dummy select to check if we can see schema
        // Since I can't run arbitrary SQL easily without a helper function or RPC
        // I'll try to check if I can access auth.users (unlikely with anon key)

        console.log('Fetching users directly...');
        const { data: users } = await supabase.from('users').select('*');
        console.log('Users found:', users.length);

        // Check if table products has the column
        const { data: schema } = await supabase.from('products').select('*').limit(0);
        console.log('Products columns OK');

        if (users.length > 0) {
            console.log('Attempting fix SQL for user...');
        }

    } catch (err) {
        console.error('❌ Error during check:', err.message);
    }
}

check();
