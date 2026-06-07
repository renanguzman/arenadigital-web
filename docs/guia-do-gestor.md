# Arena Digital — Guia do Gestor

Como usar o sistema no dia a dia: o que cada área faz, o que você pode criar ou alterar e o que o sistema faz sozinho em seguida.

---

## Sumário

1. [Como o sistema se organiza](#como-o-sistema-se-organiza)
2. [Primeiro acesso](#primeiro-acesso)
3. [Dashboard](#dashboard)
4. [Espaços](#espaços)
5. [Atletas](#atletas)
6. [Estações e comandas](#estações-e-comandas)
7. [Catálogo](#catálogo)
8. [Mensalistas](#mensalistas)
9. [Rotativo](#rotativo)
10. [Programa de fidelidade](#programa-de-fidelidade)
11. [Financeiro](#financeiro)
12. [Relatórios](#relatórios)
13. [Configurações](#configurações)
14. [Como os módulos se conectam](#como-os-módulos-se-conectam)

---

## Como o sistema se organiza

### Arena selecionada

No topo da barra lateral há o **seletor de arena**. Quase tudo ocorre dentro da arena escolhida. Ao trocar de arena, os menus passam a mostrar os dados da nova unidade.

### Quem vê o quê

| Perfil | Acesso |
|---|---|
| **Dono / Gestor** | Menu completo, incluindo Relatórios e Configurações |
| **Atendente** | Operação do dia a dia, sem Configurações |
| **Caixa** | Apenas a estação vinculada a ele ("Minha estação") ou a lista de Estações, se ainda não tiver estação atribuída |

### Assinatura e bloqueio de acesso

Cada arena tem sua própria assinatura. Se o plano **experimental expirar** ou não houver assinatura válida, o gestor/dono é **redirecionado para Assinatura** ao tentar usar outras áreas. O limite de quadras do plano também bloqueia a criação de novos espaços quando o teto é atingido.

---

## Primeiro acesso

| Etapa | O que acontece |
|---|---|
| **Cadastro** | Nome, CPF, telefone, e-mail, senha, nome da arena e endereço. Após confirmar o e-mail, o sistema cria a primeira arena, vincula o usuário como Gestor e ativa o **plano experimental (5 dias)**. |
| **Login** | Entrada com e-mail e senha. |
| **Recuperar senha** | Fluxo de redefinição por e-mail. |
| **Tutorial** | No primeiro acesso, um passo a passo destaca Dashboard, seletor de arena, Espaços, Atletas e demais áreas. Pode reaparecer quando houver novidades. |
| **Várias arenas** | O seletor lateral troca entre unidades. Hoje a edição e exclusão de arenas ficam em **Configurações → Perfil da Arena**; a criação de arenas adicionais ocorre no cadastro inicial. |

---

## Dashboard

**Menu:** Dashboard

Painel somente leitura com visão consolidada da arena (ou de **todas** as arenas, se selecionado):

- Receita do mês e variação % vs. mês anterior
- Reservas confirmadas hoje
- Quadras ativas
- Atletas ativos no mês
- Ocupação por quadra no dia

Nada é alterado aqui — os números vêm dos outros módulos.

---

## Espaços

**Menu:** Espaços → abas **Espaços** e **Cadastros**

### Espaços (quadras)

| Ação | Como fazer | Efeito |
|---|---|---|
| Cadastrar espaço | Cadastros → **Cadastrar Espaço +** | Espaço disponível para reservas. Bloqueado se o plano atingir o limite de quadras. |
| Editar / excluir | Menu **⋮** no card ou na tabela | Exclusão é permanente. |
| Ver agenda | Clique no card ou no ícone de calendário | Calendário com visão Dia/Semana, status por horário e selo de conflito. |
| Cadastrar reserva | Horário vazio ou **Cadastrar reserva** | Reserva no calendário. Confirmada com valor → entrada no Financeiro. Serviços do catálogo entram no total. Recorrência gera semanas seguintes com checagem de conflitos. |
| Gerenciar reserva | Clique na reserva → Detalhes | Editar (avulsas), anexar serviços, recalcular valor ou cancelar. |
| Operação do dia | **Ver operação do dia**, **Horários disponíveis**, **Ver oportunidades do dia** | Ajuda a identificar horários livres para vender. |

**Status no calendário:** Disponível · Confirmado · Ag. Confirmação (mensalista pendente) · Conflito

---

## Atletas

**Menu:** Atletas

| Ação | Como fazer | Efeito |
|---|---|---|
| Vincular existente | **Cadastrar atleta** → buscar CPF → **Vincular** | Atleta passa a operar na sua arena. |
| Cadastrar novo | CPF não encontrado → preencher dados → **Salvar e enviar convite** | Conta criada; e-mail de convite para definir senha do app. |
| Perfil 360º | Clique no atleta na lista | Visão consolidada: fidelidade, reservas, rotativos, comandas e pagamentos (somente leitura). |

---

## Estações e comandas

**Menu:** Estações (ou **Minha estação** para o Caixa)

| Ação | Como fazer | Efeito |
|---|---|---|
| Cadastrar / editar estação | **Cadastrar Estação** ou editar pelo card | Estação pronta para comandas; exibe métricas do dia. |
| Abrir comanda | **Abrir comanda** → cliente (atleta ou balcão) → itens → **Abrir** | Comanda em aberto; estoque dos produtos é baixado. |
| Lançar item | **Lançar item +** na comanda aberta | Soma ao total e baixa estoque. |
| Registrar pagamento | **Registrar pagamento** → forma, valor → **Salvar** | Registra o pagamento; sistema pergunta se fecha a comanda. |
| Fechar comanda | Confirmar fechamento após pagamento | Comanda fechada; cada pagamento gera entrada no Financeiro. |
| Cancelar comanda | Ação na tela da comanda | Itens voltam ao estoque. |

---

## Catálogo

**Menu:** Catálogo → abas **Produtos** e **Serviços**

| Ação | Como fazer | Efeito |
|---|---|---|
| Cadastrar produto / serviço | **Cadastrar produto** ou **Cadastrar serviço** | Produtos entram no estoque; serviços não controlam estoque e podem ir para reservas e comandas. |
| Editar / excluir | Menu de ações na linha | — |
| Entrada de estoque | **Lançar entrada** | Aumenta saldo; histórico registra a movimentação. |
| Histórico | Ícone de histórico no produto | Entradas, saídas (vendas/cancelamentos) e saldo após cada operação. |

---

## Mensalistas

**Menu:** Mensalistas

| Ação | Como fazer | Efeito |
|---|---|---|
| Criar plano | **Novo mensalista** → atleta, espaço, dia, horário, sessões/mês, valor | Gera reservas dos próximos 3 meses (atual confirmada, demais Ag. Confirmação) e lança a 1ª mensalidade no Financeiro. |
| Confirmar mês | **Confirmar** → **Confirmar pagamento** (valor ajustável) | Confirma reservas do mês pendente, lança mensalidade e gera o próximo mês. |
| Cancelar plano | **Cancelar** / **Cancelar plano** | Plano cancelado; reservas futuras não confirmadas são canceladas. |

No calendário, mensalistas pendentes aparecem como **Ag. Confirmação**.

---

## Rotativo

**Menu:** Rotativo → abas **Cadastrados** e **Gestão de créditos**

### Sessões (Cadastrados)

| Ação | Como fazer | Efeito |
|---|---|---|
| Criar sessão | **Cadastrar rotativo** | Sessão ativa para inscrições. |
| Editar sessão | Editar na sessão | Atualiza dados da sessão. |
| Ativar / desativar | Toggle na sessão | Desativada não aceita inscrições; pode **reativar** antes da data. Após a data, não reativa. |
| Inscrever atleta | Inscrever → avulso (forma de pagamento) ou crédito | Avulso → Financeiro. Crédito → consome 1 crédito do atleta. |

### Créditos (Gestão de créditos)

| Ação | Como fazer | Efeito |
|---|---|---|
| Configurar pacotes | **Adicionar pacote** → **Salvar** | Define preços por quantidade de créditos. |
| Vender créditos | **Lançar crédito** → atleta, quantidade, validade, pagamento | Credita o atleta com validade; entrada no Financeiro. Créditos vencidos são processados automaticamente. |

---

## Programa de fidelidade

**Menu:** Programa de fidelidade

| Ação | Como fazer | Efeito |
|---|---|---|
| Configurar moeda | Nome da moeda virtual → **Salvar** | Define como os pontos são chamados na arena. |
| Enviar pontos | **Novo envio** → atleta, valor, validade, descrição | Saldo do atleta sobe. |
| Resgatar pontos | **Novo resgate** → atleta, valor, descrição | Saldo do atleta desce. |
| Extrato | Link **ver extrato** | Histórico com filtros por atleta e período. |
| Ranking | Link **ver ranking** | Top atletas por saldo. |

O saldo também aparece no perfil 360º do atleta.

---

## Financeiro

**Menu:** Financeiro → abas **Entradas** e **Saídas**

| Ação | Como fazer | Efeito |
|---|---|---|
| Ver resumo | Painel e gráfico dos últimos 30 dias | Somente leitura. |
| Lançar manualmente | **Nova entrada** ou **Nova saída** | Para receitas/despesas fora dos fluxos automáticos. |
| Editar / excluir | Ações na linha do lançamento | — |

**Entradas automáticas** (não precisam ser lançadas à mão): reservas confirmadas, mensalidades, fechamento de comandas, rotativo avulso e venda de créditos.

---

## Relatórios

**Menu:** Relatórios (apenas Dono / Gestor)

| Relatório | O que mostra |
|---|---|
| **Pagamentos** | Lista unificada de reservas, comandas, rotativo (inscrições e créditos) e lançamentos manuais. Filtros por período, espaço, esporte e tipo. Resumo Pago / Pendente / Cancelado. |
| **Atletas e clientes** | Segmentação: sem reserva, 1 reserva, ativos (30 dias), frequentes (5+), inativos (90 dias) e aniversariantes (7 dias). Atalho para WhatsApp. |

Somente leitura — serve para decisão e ação comercial.

---

## Configurações

**Menu:** Configurações (apenas Dono / Gestor)

### Usuários

| Ação | Como fazer | Efeito |
|---|---|---|
| Cadastrar | **Cadastrar Usuário** → papel (Gestor / Atendente / Caixa) | Caixa exige estação vinculada. Usuário entra com a senha definida. |
| Editar / excluir | Ações na lista | Excluir remove o vínculo; se for o último, a conta é removida. |

### Assinatura

| Ação | Como fazer | Efeito |
|---|---|---|
| Cadastrar cartão / escolher plano | Fluxo na tela de assinatura | Define limites (ex.: quadras) e libera o uso do sistema. |
| Trocar plano | Seleção de plano disponível | Atualiza limites e cobrança. |
| Cancelar renovação | **Cancelar assinatura** | Acesso continua até o fim do período pago. |

Após checkout hospedado, o retorno cai automaticamente na tela de status — não é um menu separado.

### Perfil da Arena

| Ação | Como fazer | Efeito |
|---|---|---|
| Editar dados | **Editar Arena** no card da unidade | Nome, endereço, comodidades, esportes, telefone, e-mail. Endereço alimenta o mapa. |
| Busca por CNPJ | Botão **Preencher com CNPJ (Receita)** no formulário | Preenche razão social e dados cadastrais automaticamente. |
| Imagem da arena | Upload no formulário | Atualiza a foto da unidade. |
| Excluir arena | Ícone de lixeira no card | Remove a arena e quadras associadas (permanente). |

---

## Como os módulos se conectam

```
Atleta ──┬── Reserva (Espaços) ──────────► Financeiro
         ├── Mensalista ─────────────────► Reservas + Financeiro
         ├── Comanda (Estação) ──────────► Financeiro + Estoque
         ├── Rotativo ───────────────────► Financeiro (ou crédito)
         └── Fidelidade ─────────────────► Saldo no perfil do atleta

Catálogo ──► Produtos nas comandas (baixa estoque)
          └► Serviços nas reservas e comandas

Assinatura ──► Limite de espaços + acesso ao sistema

Tudo acima ──► Dashboard e Relatórios (leitura consolidada)
```

| Origem | Destino automático |
|---|---|
| Reserva confirmada com valor | Financeiro (Entradas) |
| Plano mensalista criado | 3 meses de reservas + Financeiro |
| Mensalidade confirmada | Financeiro + próximo mês de reservas |
| Comanda fechada | Financeiro |
| Comanda cancelada | Estoque devolvido |
| Rotativo avulso / crédito vendido | Financeiro |
| Fidelidade (envio/resgate) | Saldo do atleta |
| Novo espaço | Verifica limite do plano |

**Resumo:** Espaços, Estações, Rotativo e Mensalistas geram receita. Financeiro acumula tudo. Dashboard e Relatórios mostram o resultado. Catálogo abastece comandas. Atletas circulam por todos os módulos. Configurações controlam equipe, arena e plano.
