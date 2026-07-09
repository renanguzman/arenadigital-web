# SPEC — Arena Digital (Web | Gestor de Arenas)

## 1. Objetivo da Especificação

Este documento descreve **como** será implementada a versão Web do Arena Digital, voltada exclusivamente para **gestores de arenas esportivas**, detalhando arquitetura, stack técnica, padrões de desenvolvimento, autenticação, controle de acesso e integração com serviços externos.

---

## 2. Arquitetura Geral

Arquitetura **API-first**, onde toda a lógica de negócio reside no backend, e o frontend web consome a API de forma segura.

[ Landing Page ]
|
| -> Login
v
[ Web SaaS (Gestores) ] ────> [ API Serverless (Vercel) ]
|
├── Supabase Auth
├── Supabase (PostgreSQL)
└── Serviços auxiliares


---

## 3. Stack Técnica

### 3.1 Frontend Web (Gestor)
- Next.js (App Router)
- TypeScript
- TailwindCSS
- Supabase Auth SDK
- Fetch / Axios para consumo da API

---

### 3.2 Backend
- Next.js API Routes ou Edge Functions
- TypeScript
- Supabase Client (Service Role)
- Zod (validação de payloads)
- Arquitetura modular por domínio

---

### 3.3 Infraestrutura
- Deploy: Vercel
- Banco de dados: Supabase (PostgreSQL)
- Autenticação: Supabase Auth
- Versionamento: GitHub

---

## 4. Autenticação e Autorização

### 4.1 Autenticação (Supabase Auth)

- Toda autenticação é realizada via Supabase Auth
- O frontend nunca persiste senhas fora do provedor de autenticação
- A sessão Supabase autentica as requisições protegidas

Header padrão:
Authorization: Bearer <supabase_access_token>

---

### 4.2 Autorização (RBAC)

Controle de acesso baseado em **roles** por arena. O sistema usa 3 perfis de usuário (mapeados para as roles do banco):

| Perfil          | Role no banco | Acesso                                                                                           |
|-----------------|---------------|--------------------------------------------------------------------------------------------------|
| Administrador   | `Gestor`      | Acesso **total e irrestrito** a todas as funcionalidades                                         |
| Usuário comum   | `Atendente`   | Dashboard, Atletas, Espaços, Estações, Produtos, Financeiro, Loyalty, Rotativo, Relatórios — **sem Configurações** |
| Caixa           | `Caixa`       | Acesso **somente ao menu Estações**                                                              |

> O `Owner` da arena equivale ao Administrador (acesso total).

#### Regras de redirecionamento para o perfil Caixa
- Caixa **com estação atribuída**: redirecionado automaticamente para `/dashboard/arenas/{id}/stations/{stationId}`
- Caixa **sem estação atribuída**: redirecionado para `/dashboard/arenas/{id}/stations` (lista de estações)
- A Sidebar exibe apenas o item de menu "Estações" (ou "Minha Estação" se houver estação vinculada)

#### Funções de proteção de rota (server-side — `src/lib/server-auth.ts`)
| Função                         | Quem é bloqueado       | Uso                                      |
|--------------------------------|------------------------|------------------------------------------|
| `assertArenaAccess`            | Nenhum (qualquer membro) | Verificação básica de acesso à arena   |
| `assertArenaBackofficeAccess`  | Caixa                  | Financeiro, Loyalty, Rotativo, Espaços  |
| `assertArenaAdminAccess`       | Caixa + Atendente      | Configurações exclusivas de Admin       |
| `assertArenaOwnerAccess`       | Todos (exceto Owner)   | Ações restritas ao dono da arena        |
| `assertArenaSubscriptionAccess`| Não-Owner e não-Gestor | Gerenciamento de assinatura             |

A validação ocorre no backend via server components e API routes.

---

## 5. Middleware de Segurança

### Responsabilidades
- Validar sessão Supabase
- Extrair `auth.users.id`
- Buscar usuário interno no Supabase
- Verificar role e arena associada
- Bloquear acessos não autorizados

---

## 6. Modelo de Dados (Visão Técnica)

### 6.1 Users

```sql
users
- id (uuid, pk)
- email (text, unique)
- email (text)
- name (text)
- role (admin | gestor)
- created_at (timestamp)

arenas
- id (uuid, pk)
- name (text)
- address (text)
- opening_hours (jsonb)
- is_active (boolean)
- created_at (timestamp)

courts
- id (uuid, pk)
- arena_id (uuid, fk)
- name (text)
- type (text)
- capacity (int)
- is_active (boolean)
- created_at (timestamp)

bookings
- id (uuid, pk)
- arena_id (uuid, fk)
- court_id (uuid, fk)
- athlete_id (uuid)
- start_time (timestamp)
- end_time (timestamp)
- status (confirmed | cancelled)
- created_at (timestamp)


7. Endpoints — Web Gestor
Autenticação / Sessão
GET /api/v1/me

Arenas
GET    /api/v1/arenas
POST   /api/v1/arenas
PUT    /api/v1/arenas/{id}
DELETE /api/v1/arenas/{id}


Quadras
GET    /api/v1/arenas/{arenaId}/courts
POST   /api/v1/arenas/{arenaId}/courts
PUT    /api/v1/courts/{id}
DELETE /api/v1/courts/{id}


Agenda / Reservas
GET    /api/v1/arenas/{arenaId}/bookings


Usuários
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}


8. Padrão de Resposta da API
{
  "success": true,
  "data": {},
  "message": "Operação realizada com sucesso",
  "errors": null
}


9. Supabase — Diretrizes Técnicas

PostgreSQL como banco principal

Row Level Security (RLS) habilitado

Policies baseadas em:

auth_user_id

role

relacionamento com arena_id

Acesso ao banco sempre via backend

10. Estrutura de Pastas (Backend)

src/
 ├── modules/
 │    ├── auth/
 │    ├── users/
 │    ├── arenas/
 │    ├── courts/
 │    └── bookings/
 ├── shared/
 │    ├── middleware/
 │    ├── database/
 │    └── utils/
 └── app/api/


11. Deploy — Vercel
Ambientes

main → produção

develop → staging

Variáveis de Ambiente

CLERK_SECRET_KEY

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

12. Estações — Listagem Paginada de Comandas

Tela: /dashboard/arenas/{id}/stations/{stationId}
Componentes: src/modules/stations/components/StationDetailPageClient.tsx
Server actions: src/modules/stations/actions/stationActions.ts

Contrato (StationOrdersFilters — src/modules/stations/types/station.types.ts):

interface StationOrdersFilters {
  page?: number        // default 1
  pageSize?: number    // 10 | 25 | 50 | 100 (default 25)
  status?: 'open' | 'closed' | 'todos'  // default na UI: 'open'
  search?: string      // busca por cliente/nº da comanda em todo o banco
  dateFrom?: string    // ISO timestamp (inclusive) — created_at >=
  dateTo?: string      // ISO timestamp (inclusive) — created_at <=
}

Actions:
- getStationWithOrdersAction(arenaId, stationId, filters) → { success, station, orders, total }
- getOrdersByStationAction(arenaId, stationId, filters) → { success, data, total }

Implementação:
- Paginação via .range() do Supabase com count: 'exact' (total retornado para a UI)
- Busca por cliente: OR entre customer_name ILIKE, atleta_id IN (ids de atleta com
  nome_perfil ILIKE — pré-consulta limitada a 200 ids) e order_number (se o termo for numérico)
- Filtros de status e data aplicados no banco, combinados com a busca
- UI: debounce de 400ms na busca; mudança de filtro/busca/pageSize reseta para página 1;
  a primeira página é renderizada no servidor (SSR) com os filtros default

13. Rotativo — Modal "Novo crédito" (busca de atleta)

Tela: /dashboard/rotativo/{arenaId} — aba Gestão de créditos
Componente: src/modules/rotativos/components/CreditosTab.tsx
Server action: getAthletesByArenaAction(arenaId, searchTerm?) — src/modules/athletes/actions/athleteActions.ts

- Campo "Selecione o atleta" é um input de busca (substituiu o select que carregava
  todos os atletas da arena)
- A busca dispara a partir do 3º caractere, com debounce de 400ms
- Filtro server-side: nome_perfil ILIKE %termo%, restrito aos atletas vinculados à arena
  (join arenas_atleta) — SupabaseAthleteRepository.findByArena
- Ao selecionar, o atleta vira um chip com opção de remover (X); o id alimenta o campo
  athleteId do formulário (react-hook-form + zod)
