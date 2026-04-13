-- Enable RLS on all tables and block anon key access to sensitive data.
-- Catalogue tables (sports, comodidades, station_types) remain publicly readable.
-- Authenticated server-side queries use service_role which bypasses RLS automatically.

-- 1. Enable RLS
ALTER TABLE arenas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_sports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_comodidades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE atleta                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas_atleta               ENABLE ROW LEVEL SECURITY;
ALTER TABLE atleta_esportes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_fidelidade_extrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comodidades                 ENABLE ROW LEVEL SECURITY;

-- 2. Catalogue tables: public read (anon + authenticated)
CREATE POLICY "public_read_sports"
  ON sports FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public_read_comodidades"
  ON comodidades FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public_read_station_types"
  ON station_types FOR SELECT TO anon, authenticated USING (true);

-- 3. Block anon key on all sensitive tables
--    (service_role bypasses RLS automatically — no policy needed for it)
CREATE POLICY "block_anon" ON arenas                      FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON arena_users                 FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON arena_sports                FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON arena_comodidades           FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON users                       FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON bookings                    FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON transactions                FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON atleta                      FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON arenas_atleta               FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON atleta_esportes             FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON courts                      FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON stations                    FOR ALL TO anon USING (false);
CREATE POLICY "block_anon" ON programa_fidelidade_extrato FOR ALL TO anon USING (false);
