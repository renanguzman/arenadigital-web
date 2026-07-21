# PRD — Arena Digital (Web | Gestor de Arenas)

## 1. Visão Geral do Produto

**Nome:** Arena Digital  
**Versão:** SaaS Web — Gestão de Arenas  
**Público:** Gestores de Arenas Esportivas  
**Arquitetura:** API-first  
**Infraestrutura:** Serverless  

O Arena Digital – Web é um sistema SaaS voltado exclusivamente para **gestores de arenas esportivas**, permitindo a administração completa de arenas, quadras, espaços recreativos(salão de festas, churrasqueiras, etc), horários, usuários e indicadores operacionais.

O acesso ao sistema ocorre por meio de login, disponível a partir da landing page pública do Arena Digital.

---

## 2. Objetivo do Produto

- Digitalizar e centralizar a gestão de arenas esportivas
- Reduzir processos manuais de agendamento e controle
- Oferecer visão clara de operação e uso das arenas
- Garantir segurança e controle de acesso por perfil
- Servir como base administrativa para o aplicativo mobile dos atletas

---

## 3. Perfil do Usuário (Gestor)

### 3.1 Gestor de Arena
- Responsável pela operação da arena
- Controla quadras, horários e usuários
- Acompanha indicadores de uso

### 3.2 Administrador do Sistema
- Acesso total à plataforma
- Pode gerenciar múltiplas arenas
- Define permissões e configurações globais

---

## 4. Escopo da Versão Web

### Dentro do Escopo
- Gestão de arenas
- Gestão de quadras
- Agenda e horários
- Gestão de usuários (gestores e atletas)
- Relatórios básicos
- Configurações da arena
- Pagamentos online
- Integração com gateways
- Gestão de produtos
- Gestão de caixas
- Gestão de estações

### Fora do Escopo (MVP)
- Marketplace
- Multi-idioma
- White-label

---

## 5. Funcionalidades do MVP

### 5.1 Autenticação e Acesso
- Login via Supabase Auth
- Controle de sessão
- Logout
- Proteção de rotas autenticadas
- Controle de acesso por perfil (RBAC)
- Esqueci minha senha (recuperação de senha)

---

### 5.2 Dashboard do Gestor
- Visão geral da arena
- Indicadores principais:
  - Ocupação das quadras
  - Horários disponíveis vs ocupados
  - Atletas cadastrados
- Acesso rápido às principais ações

---

### 5.3 Gestão de Arenas
- Cadastro de arena
  - Nome
  - Status (Aberto / Fechado / Fechado Temporariamente)
  - Esportes (Futebol, Vôlei, Beach Tennis, Paddle, Tênis, Futevôlei, etc)
  - Dias de funcionamento e horário
  - Endereço (Cep, Cidade, Estado, Bairro, Rua, Número, Complemento)
  - Telefone
  - Email
- Edição de dados da arena
- Nome da Moeda Digital

---

### 5.4 Gestão de Quadras
- Cadastro de quadras
- Tipo de quadra (beach tennis, volei, futevolei, futebol, paddle, tênis, etc.)
- Capacidade
- Status (Ativa / Inativa / Em manutenção)
- Associação com arena
- Preço da quadra atribuido a dia e horario
- Atributos da quadra
  - Coberta
  - Descoberta
  - Areia
  - Grama
  - Piso Sintético

---

### 5.5 Agenda e Horários
- Configuração de horários de funcionamento
- Visualização de agenda por quadra
- Bloqueio de horários
- Visualização de reservas feitas por atletas
- Possibilidade de cancelar reservas
- Possibilidade de alterar reservas
- Possibilidade de prorrogar reservas
- Possibilidade de remarcar reservas  
- Possibilidade de adicionar créditos a atletas
- Possibilidade de remover créditos de atletas
- Possibilidade marcar agendamento avulso e recorrente
- Atribuir uma reserva a uma pessoa responsável e a um grupo (opcional)  

---

### 5.6 Gestão de Usuários
- Visualização de atletas cadastrados
- Associação de atletas à arena
- Gestão de gestores secundários
- Definição de permissões
- Possibilidade de convidar atletas para a arena

---

### 5.7 Relatórios Básicos
- Uso das quadras por período
- Horários mais utilizados
- Quantidade de reservas

---

### 5.8 Gestão de Estações (Bar - Loja)
- Cadastro de estações
- Edição de dados da estação
- Ativação/desativação
- Informações gerais:
  - Nome
  - Status (Ativo / Em manutenção / Desativado)
  - Tipo (Bar / Loja / Outros)
- Associação com arena
- Uma Estação pode ter mais de uma caixa

---

### 5.8.1 Gestão de Caixas
- Cadastro de caixas
- Cada caixa está vinculado a uma estação
- Edição de dados da caixa
- Ativação/desativação
- Dentro do caixa é possível lançar itens de consumo (produtos e serviços)
- No caixa posso lançar uma comanda que contem itens de consumo
  - Abrir nova comanda:
    - Seleciono o cliente
    - Seleciono os itens (Listagem de itens de consumo daquela Arena)
    - Seleciono a quantidade

---

### 5.8.2 Registrar Pagamento
- Para registrar o pagamento, visualizo todas as comandas abertas dentro de um determinado caixa
- Com a comanda selecionada, visualizo os itens, quantidade por iten, valor unitário e valor total
- Posso registrar o pagamento da comanda
- Para registrar o pagamento:
  - Seleciono o método de pagamento
  - Informo o valor pago
  - Informo a forma de pagamento
  - Informo Observação (se houver)
  - Confirmo o pagamento
- Após confirmar o pagamento, a comanda é fechada

---

### 5.8.3 Listagem de Comandas da Estação (✅ Implementado)
- Ao acessar uma estação, as comandas são listadas em cards com paginação server-side (o banco pode conter milhares de comandas por dia)
- Paginação: 10, 25, 50 ou 100 comandas por página (default: 25)
- Filtro de status: Abertas (default), Fechadas ou Todos os status
- Busca por cliente: consulta todos os registros do banco (não apenas os visíveis na página), respeitando o status selecionado; busca por nome do cliente avulso, nome de perfil do atleta ou nº da comanda
- Filtro de data de abertura da comanda: intervalo "De" e "Até"
- Qualquer mudança de filtro/busca retorna à primeira página

---

### 5.8.4 Rotativo — Gestão de Créditos (✅ Implementado)
- Configuração de pacotes de créditos (quantidade × valor em reais)
- Lançamento de crédito para atleta via modal "Novo crédito"
  - Seleção do atleta por input de busca: pesquisa pelo nome direto no banco a partir do 3º caractere digitado (evita carregar todos os atletas cadastrados)
  - Quantidade de rotativos, validade e forma de pagamento
- Listagem paginada de movimentações (compra / uso / vencimento) com busca por atleta
- Ranking dos atletas com mais créditos

---

### 5.9 Gestão de Produtos (Catálogo)
- Cadastro de produtos e serviços
- Edição de dados do produto
- Ativação/desativação (status Ativo / Inativo)
- Informações gerais:
  - Nome
  - Categoria (família do item, cadastrada pelo gestor)
  - Tipo de estação (produtos)
  - Status (Ativo / Inativo)
  - Valor (valor unitário)
- Associação com arena
- Controle de estoque com histórico de movimentações (entradas, saídas e estornos)

#### 5.9.1 Categorias de Produtos e Serviços
- **Status:** Implementado (21/07/2026).
- CRUD de categorias por arena, separadas por escopo (produtos e serviços).
- Cada produto/serviço pertence a uma categoria (família), organizando o catálogo.
- Categorias podem ser renomeadas, reordenadas e inativadas.
- Categorias com itens vinculados não podem ser excluídas, apenas inativadas.
- Filtro por categoria na listagem do catálogo.

#### 5.9.2 Reajuste de Preço em Massa
- **Status:** Implementado (21/07/2026).
- Objetivo: permitir ao gestor reajustar o preço de todos os itens de uma categoria de uma vez (ex.: +10% em todas as bebidas).
- Tipos de reajuste: percentual (ex.: +10%, -5%) ou valor fixo (ex.: +R$ 1,00).
- Regras de arredondamento: sem arredondamento (2 casas) ou terminação comercial ,00 / ,50 / ,90.
- Opção de incluir itens inativos; por padrão atinge apenas itens Ativos.
- **Preview obrigatório:** antes de confirmar, o gestor vê a tabela com preço atual → preço novo de cada item.

#### 5.9.3 Histórico de Alterações de Preço
- **Status:** Implementado (21/07/2026).
- Registro de toda alteração de preço, individual (edição do item) ou em massa.
- Cada registro guarda preço anterior, novo preço, tipo (manual/em massa), percentual aplicado, motivo, autor e data.
- Consulta por produto/serviço através de modal de histórico.

---

## 6. Requisitos Não Funcionais

- Interface simples e responsiva
- Performance adequada para uso diário
- Segurança no acesso e nos dados
- Compatibilidade com navegadores modernos
- Disponibilidade 24/7

---

## 7. Restrições Técnicas

- Autenticação obrigatória via Supabase Auth
- Banco de dados Supabase (PostgreSQL)
- Backend serverless (Vercel)
- Consumo exclusivo via API REST
- Código versionado no GitHub

---

## 8. Métricas de Sucesso

- Número de arenas ativas
- Gestores ativos mensalmente
- Taxa de utilização das quadras
- Frequência de acesso ao sistema
- Retenção de gestores

---

## 9. Premissas

- Gestores possuem acesso à internet
- Cada arena possui ao menos um gestor responsável
- O sistema web é a fonte oficial de dados administrativos

---

## 10. Riscos e Dependências

- Adoção inicial pelos gestores
- Qualidade do cadastro de dados
- Dependência da estabilidade de serviços terceiros (Supabase, Vercel)


## 11. Fluxo de Agendamento

teste
