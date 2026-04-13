-- =============================================================================
-- RLS Setup — Arena Digital
-- Execute no painel Supabase: SQL Editor
--
-- ATENÇÃO: Ajuste os nomes de tabela se necessário (rode `\dt` no SQL Editor
-- para confirmar os nomes exatos antes de executar).
--
-- Contexto: o projeto usa Clerk para autenticação. O Supabase não recebe
-- tokens JWT do Clerk, então auth.uid() retorna NULL nas queries do browser.
-- A estratégia adotada é a OPÇÃO A do plano:
--   - Todas as queries autenticadas passam por Route Handlers (server-side)
--     que usam o service_role. O RLS serve como camada extra de defesa.
--   - O anon key no browser só deve acessar tabelas públicas read-only
--     (ex: sports, comodidades, station_types).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- -----------------------------------------------------------------------------

ALTER TABLE arenas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_sports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_comodidades    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE atleta               ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas_atleta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE atleta_esportes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_fidelidade_extrato ENABLE ROW LEVEL SECURITY;

-- Tabelas de catálogo (leitura pública liberada abaixo)
ALTER TABLE sports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE comodidades          ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. TABELAS DE CATÁLOGO — leitura pública (sem auth necessária)
-- -----------------------------------------------------------------------------

-- sports: qualquer um pode ler a lista de esportes
CREATE POLICY "public_read_sports"
ON sports FOR SELECT
TO anon, authenticated
USING (true);

-- comodidades: idem
CREATE POLICY "public_read_comodidades"
ON comodidades FOR SELECT
TO anon, authenticated
USING (true);

-- station_types: idem
CREATE POLICY "public_read_station_types"
ON station_types FOR SELECT
TO anon, authenticated
USING (true);

-- -----------------------------------------------------------------------------
-- 3. BLOQUEAR ACESSO DIRETO AO ANON KEY NAS TABELAS SENSÍVEIS
--    O service_role bypassa RLS automaticamente — não precisa de política para ele.
--    As políticas abaixo bloqueiam o anon key e requerem authenticated.
--    Como o projeto roteia queries autenticadas pelo servidor (service_role),
--    o bloco abaixo serve como rede de segurança caso alguma query vaze pro browser.
-- -----------------------------------------------------------------------------

-- arenas: bloqueia tudo via anon; authenticated só chega aqui via erro de roteamento
-- (o correto é o server usar service_role, mas como fallback de segurança:)
CREATE POLICY "block_anon_arenas"
ON arenas FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_users"
ON users FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_bookings"
ON bookings FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_transactions"
ON transactions FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_atleta"
ON atleta FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_arenas_atleta"
ON arenas_atleta FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_atleta_esportes"
ON atleta_esportes FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_courts"
ON courts FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_stations"
ON stations FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_arena_users"
ON arena_users FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_arena_sports"
ON arena_sports FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_arena_comodidades"
ON arena_comodidades FOR ALL
TO anon
USING (false);

CREATE POLICY "block_anon_fidelidade"
ON programa_fidelidade_extrato FOR ALL
TO anon
USING (false);

-- -----------------------------------------------------------------------------
-- 4. VERIFICAÇÃO — rode depois de aplicar as políticas
-- -----------------------------------------------------------------------------

-- Liste todas as tabelas e o status do RLS:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Liste todas as policies criadas:
-- SELECT schemaname, tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- -----------------------------------------------------------------------------
-- PRÓXIMO PASSO (Opção B — longo prazo):
-- Integrar Clerk com Supabase via JWT template para usar auth.jwt() ->> 'clerk_user_id'
-- nas políticas. Isso permite queries autenticadas direto do browser com RLS real.
-- Documentação: https://supabase.com/docs/guides/auth/third-party/clerk
-- -----------------------------------------------------------------------------
