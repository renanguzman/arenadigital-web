# Arena Digital — Guia do Gestor (visão do usuário)

> Como cada coisa é feita **dentro do sistema**: por onde ir, o que clicar e **qual efeito** isso causa.
> Organizado pela ordem do menu lateral. Para a visão técnica (actions, banco), veja `visao-geral-modulos.md`.

---

## Antes de tudo: a barra lateral e a arena selecionada

No topo da barra lateral há o **seletor de arena**. Quase tudo que você faz é dentro da arena selecionada ali. Se trocar a arena, todos os menus (Espaços, Financeiro, etc.) passam a apontar para a nova.

O menu se adapta a **quem está logado**:
- **Dono / Gestor (Admin):** vê tudo, incluindo Relatórios e Configurações.
- **Atendente:** opera o dia a dia, sem Configurações.
- **Caixa:** vê só "Minha estação" (ou "Estações") — fica preso à estação vinculada a ele.

---

## 0. Acesso e primeiro uso

### 0.1. Cadastro do gestor (signup)
- Na tela de **cadastro**, o novo gestor informa nome, CPF, telefone, e-mail/senha, **nome da arena** e endereço, e recebe um **e-mail de confirmação**.
- Ao confirmar o e-mail, o sistema **cria a primeira arena automaticamente**, vincula o usuário como **Gestor** e já ativa um **plano experimental (5 dias)**.

### 0.2. Login e recuperação de senha
- Tela de **entrar** (sign-in) e fluxo de **redefinir senha** (reset-password).

### 0.3. Tutorial de boas-vindas
- No primeiro acesso aparece um **tutorial guiado** (passo a passo destacando Dashboard, seletor de arena, Espaços, Atletas, etc.). Ele é versionado — se houver novidades, pode reaparecer.

### 0.4. Trabalhando com várias arenas
- O **seletor de arena** na barra lateral troca o contexto entre suas unidades.
- É possível ter mais de uma arena na mesma conta (cada uma com sua própria assinatura/limite).

---

## 1. Dashboard

**Onde fica:** menu **Dashboard** (`/dashboard`).

**O que mostra (somente leitura):**
- **Receita do mês** e a variação % comparada ao mês anterior.
- **Reservas confirmadas hoje**.
- **Número de quadras** ativas.
- **Atletas ativos** no mês.
- **Ocupação por quadra** no dia (% de horários preenchidos).

**Como usar:** dá para ver uma arena específica ou escolher **"Todas"** para somar os números de todas as suas arenas.

> Efeito: nada é alterado aqui. É o painel de leitura que consolida o que os outros módulos produzem.

---

## 2. Espaços (quadras e agenda)

**Onde fica:** menu **Espaços** → abre a tela da arena com duas abas: **Espaços** e **Cadastros**.

### 2.1. Cadastrar um espaço (quadra)
1. Aba **Cadastros** → botão **"Cadastrar Espaço +"**.
2. Preencha nome, esporte(s), se é coberta/descoberta, **configuração de horários por dia da semana** (com preço, inclusive faixas de preço diferentes via "Adicionar faixa"), valor e observações.
3. Salvar.

> **Efeito:** o espaço passa a aparecer como card na aba **Espaços** e fica disponível para receber reservas. **Atenção:** se o seu plano tiver limite de quadras e ele já estiver cheio, o sistema **bloqueia** e pede para atualizar o plano.

### 2.2. Editar / ver detalhes / excluir um espaço
- No card do espaço (ou na tabela em Cadastros), use o menu **⋮**: **Ver detalhes**, **Editar** ou **Excluir**.
- Excluir pede confirmação (**"A exclusão é permanente…"**).

> **Efeito:** excluir remove o espaço e seus dados de forma permanente.

### 2.3. Ver a agenda / calendário de um espaço
1. Clique no card do espaço (ou no ícone de calendário) → abre o **calendário** daquele espaço.
2. Alterne entre visão **Dia** e **Semana**; navegue com as setas ou botão **Hoje**.
3. O calendário mostra cada horário: vazio ("Disponível"), **Confirmado** (cor do esporte) ou **Ag. Confirmação** (amarelo tracejado, mensalista não pago). Conflitos aparecem com selo **⚠ Conflito**.

### 2.4. Cadastrar uma reserva
Há dois caminhos: clicar num **horário vazio** no calendário, ou no botão **"Cadastrar reserva"**.
1. Escolha/2 digite o **atleta** (pode buscar um vinculado ou cadastrar um novo na hora).
2. Defina horário, valor e, se quiser, **adicione serviços** do catálogo (ex.: aluguel de raquete).
3. Pode marcar **recorrência** (repetir em semanas seguintes) — o sistema verifica conflitos e mostra antes de salvar.
4. Salvar.

> **Efeito:** a reserva aparece no calendário. **Se for confirmada e tiver valor, é criada automaticamente uma entrada no Financeiro** ("Reserva Avulsa"). Serviços anexados entram no valor total.

### 2.5. Detalhes / editar / cancelar uma reserva
- Clique numa reserva no calendário → abre **Detalhes da reserva**.
- Lá dá para **editar** (reservas avulsas), **adicionar serviços e recalcular o valor**, e **cancelar**.

> **Efeito:** cancelar muda o status para "Cancelado" (some das contagens e relatórios como ativo). Mensalistas têm fluxo próprio (ver seção 6).

### 2.6. Operação do dia e oportunidades
- **"Ver operação do dia"** e **"Horários disponíveis"** (na aba Espaços) e **"Ver oportunidades do dia"** (no calendário) ajudam a enxergar buracos na agenda para vender.

---

## 3. Atletas (sua base de clientes)

**Onde fica:** menu **Atletas**.

### 3.1. Cadastrar / vincular atleta
1. Botão **"Cadastrar atleta"** → abre o assistente.
2. Primeiro passo é **buscar pelo CPF**:
   - Se o CPF **já existe** no Arena Digital → tela "Atleta encontrado" → **"Vincular"** liga esse atleta à sua arena.
   - Se **não existe** → "Cadastrar novo atleta": preencha nome, telefone, e-mail, esporte/nível, data de nascimento e endereço → **"Salvar e enviar convite"**.

> **Efeito:** ao cadastrar novo, o sistema cria o acesso do atleta e **envia um convite por e-mail** para ele definir a senha do app. O atleta passa a ficar disponível para reservas, comandas, rotativos e fidelidade na sua arena.

### 3.2. Ver o perfil 360º do atleta
- Clique num atleta da lista → painel completo com: **saldo de fidelidade**, **reservas** (total e do mês), **esportes/níveis**, **rotativos**, **comandas** (abertas/fechadas e total gasto) e **pagamentos** feitos na arena.

> Efeito: somente leitura — é o raio-x do cliente cruzando todos os módulos.

---

## 4. Estações e Comandas (bar/lanchonete)

**Onde fica:** menu **Estações**. Um **Caixa** entra direto na estação dele.

### 4.1. Cadastrar / editar estação
- **"Cadastrar Estação"** → nome, tipo (ex.: Bar) e status. Editar pelo card da estação.

> **Efeito:** a estação passa a poder abrir comandas e aparece com **métricas** (comandas abertas, abertas/fechadas hoje).

### 4.2. Abrir uma comanda
1. Dentro da estação → **"Abrir comanda"**.
2. Escolha o cliente: um **atleta vinculado** ou cadastre um **cliente de balcão** ("Cadastrar novo +").
3. Busque produtos/serviços e adicione os itens → **"Abrir"**.

> **Efeito:** cria a comanda em aberto. **O estoque dos produtos é baixado na hora** (serviços não mexem no estoque). Se algo falhar, o sistema desfaz a baixa.

### 4.3. Lançar mais itens
- Na comanda aberta → **"Lançar item +"** → busca o produto → **"Lançar"**.

> **Efeito:** soma ao total da comanda e baixa mais estoque.

### 4.4. Registrar pagamento e fechar comanda
1. **"Registrar pagamento"** → forma de pagamento, quem pagou, valor → **"Salvar"**.
2. O sistema pergunta se quer **"Fechar comanda"**.

> **Efeito:** ao fechar, a comanda vira "Fechada" e **cada pagamento gera uma entrada no Financeiro** (categoria = tipo da estação, ex.: "Bar - Comanda #007"). Se a comanda for cancelada, o estoque dos itens **volta** para o saldo.

---

## 5. Catálogo (produtos e serviços + estoque)

**Onde fica:** menu **Catálogo**.

### 5.1. Cadastrar produto ou serviço
- **"Cadastrar produto"** (ou aba **Serviços** → "Cadastrar serviço"). Defina nome, preço, tipo, estação e status.

> **Efeito:** produtos entram no controle de estoque; **serviços não controlam estoque** e podem ser anexados a reservas e comandas.

### 5.2. Editar / excluir
- Pelo menu de ações na linha do item.

### 5.3. Estoque
- **"Lançar entrada"** → quantidade, fornecedor, data → **"Registrar Entrada"**.
- O **histórico de movimentações** mostra cada entrada/saída com o saldo após cada operação.

> **Efeito:** a entrada aumenta o saldo; vendas em comandas reduzem; cancelamentos devolvem. Tudo fica registrado no histórico.

---

## 6. Mensalistas

**Onde fica:** menu **Mensalistas**.

### 6.1. Criar um plano mensalista
1. **"Novo mensalista"** → escolha atleta, espaço, esporte, dia da semana, horário, nº de sessões/mês e valor mensal.
2. Salvar.

> **Efeito:** o sistema **gera automaticamente as reservas dos próximos 3 meses** (o mês atual já entra como **Confirmado**, os próximos como **Ag. Confirmação**) e **registra a mensalidade do 1º mês** no Financeiro.

### 6.2. Confirmar o pagamento de um mês
- Na lista, botão **"Confirmar"** → **"Confirmar pagamento"** (pode ajustar o valor).

> **Efeito:** confirma as reservas do mês mais antigo pendente, **lança a mensalidade no Financeiro** e **já gera o próximo mês** de reservas automaticamente.

### 6.3. Cancelar plano
> **Efeito:** o plano fica "cancelado" e as **reservas futuras ainda não confirmadas** são canceladas (as já confirmadas permanecem).

---

## 7. Rotativo (sessões avulsas + créditos)

**Onde fica:** menu **Rotativo**, com abas de sessões (**Cadastrados**) e **Créditos**.

### 7.1. Criar uma sessão de rotativo
- **"Cadastrar rotativo"** → esporte, quadra(s), data, horário, valor e (opcional) limite de vagas.

> **Efeito:** a sessão fica **ativa** e aberta para inscrições. Dá para **ativar/desativar**, mas não reativar depois da data.

### 7.2. Inscrever atleta numa sessão
- Na sessão → inscrever atleta → escolha pagar **avulso** (forma de pagamento) **ou usar crédito**.

> **Efeito:** se for avulso, **gera entrada no Financeiro** ("Rotativo"). Se for crédito, consome 1 crédito do atleta (precisa ter saldo).

### 7.3. Vender créditos (aba Créditos)
1. Configure os **pacotes** de crédito (**"Adicionar pacote"** → "Salvar").
2. **"Lançar crédito"** → atleta, quantidade, validade, forma de pagamento → **"Novo crédito"**.

> **Efeito:** o sistema calcula o valor pelo pacote, credita o atleta com validade e **gera entrada no Financeiro**. Créditos vencidos podem ser expirados automaticamente.

---

## 8. Programa de Fidelidade

**Onde fica:** menu **Programa de fidelidade**.

### 8.1. Configurar a moeda
- Defina o **nome da sua moeda virtual** e **"Salvar"**.

### 8.2. Enviar pontos
- **"Novo envio"** → escolha o atleta, valor (pontos), validade e descrição → **"Enviar"**.

### 8.3. Resgatar/descontar pontos
- **"Novo resgate"** → atleta, valor, descrição → **"Descontar"**.

> **Efeito:** o saldo do atleta sobe (envio) ou desce (resgate) e aparece no **perfil 360º** dele.

### 8.4. Telas auxiliares
- **Extrato** (link "ver extrato"): histórico completo de envios/resgates, com filtros por atleta e período.
- **Top atletas** (link "ver ranking"): ranking dos atletas com maior saldo/pontuação.
- A tela principal também lista os **saldos por atleta**.

---

## 9. Financeiro

**Onde fica:** menu **Financeiro** (com abas **Entradas** e **Saídas**).

### 9.1. Painel
- Mostra resumo, lançamentos recentes e o **gráfico dos últimos 30 dias**.

### 9.2. Lançar manualmente
- **"Nova entrada"** ou **"Nova saída"** → nome do lançamento, tipo, forma de pagamento, valores → **"Salvar"**.
- Dá para **editar** e **excluir** lançamentos.

> **Importante:** boa parte das entradas **chega sozinha** de outros módulos — reservas pagas, mensalidades, fechamento de comandas e vendas de rotativo. Use o lançamento manual para o que não passa por esses fluxos.

---

## 10. Relatórios (apenas Admin)

**Onde fica:** menu **Relatórios**.

### 10.1. Pagamentos (Status de pagamentos)
- Junta numa única lista **5 fontes**: reservas, comandas, inscrições de rotativo, créditos de rotativo e lançamentos manuais.
- Filtros por período, espaço, esporte e tipo; resumo de **Pago / Pendente / Cancelado**.

### 10.2. Atletas e clientes (visão de clientes)
- Segmenta sua base em: **sem reserva**, **1 reserva**, **ativos recentes (30 dias)**, **frequentes (5+)**, **inativos (90 dias)** e **aniversariantes (7 dias)**.
- Tem atalho para **enviar mensagem no WhatsApp** — útil para reativar clientes.

> Efeito: somente leitura. Servem para decisão e ação comercial.

---

## 11. Configurações (apenas Admin)

**Onde fica:** menu **Configurações** (submenu).

### 11.1. Usuários (sua equipe)
- **"Cadastrar Usuário"** → nome, e-mail, senha, papel (Gestor/Atendente/Caixa). **Caixa exige escolher a estação** dele.
- Editar (inclui trocar senha) e **excluir**.

> **Efeito:** o usuário criado já pode entrar com a senha definida. Excluir desvincula; se for o último vínculo dele, a conta é removida de vez.

### 11.2. Assinatura
- Onde você **cadastra o cartão**, **ativa/escolhe o plano** e troca de plano.

> **Efeito:** define o que sua arena pode usar — por exemplo, o **limite de quadras**. Sem plano válido, **não dá para criar novos espaços**.

### 11.3. Perfil da Arena
- Dados da arena (nome, endereço, comodidades, esportes, etc.). O endereço alimenta a **localização no mapa**.
- Há **busca por CNPJ** que preenche automaticamente os dados cadastrais, e **upload de imagem** da arena.
- Também é aqui (ou via fluxo de arenas) que se pode **criar uma arena adicional** e editar/excluir arenas existentes.

---

## 12. Mapa rápido: onde cada coisa "cai"

| O que você faz | Onde | Efeito automático |
|---|---|---|
| Reserva confirmada com valor | Espaços › calendário | Entrada no **Financeiro** |
| Cria plano mensalista | Mensalistas | 3 meses de reservas + mensalidade no **Financeiro** |
| Confirma mês do mensalista | Mensalistas | Mensalidade no **Financeiro** + gera o próximo mês |
| Fecha comanda | Estações | Entrada(s) no **Financeiro** + baixa de **estoque** |
| Cancela comanda | Estações | **Estoque** devolvido |
| Inscreve/vende rotativo | Rotativo | Entrada no **Financeiro** (ou consome crédito) |
| Envia/resgata fidelidade | Fidelidade | Atualiza **saldo do atleta** |
| Cadastra espaço | Espaços | Verifica **limite do plano** |
| Tudo acima | — | Aparece em **Relatórios** e **Dashboard** |

---

### Resumo mental
- **Espaços, Estações, Rotativo e Mensalistas** são onde o dinheiro **entra**.
- **Financeiro** é onde tudo **se acumula** (boa parte automática).
- **Relatórios e Dashboard** são onde você **enxerga** o resultado.
- **Catálogo/Estoque** abastece as comandas; **Atletas** é o cliente que circula por tudo.
- **Configurações/Assinatura** controlam **quem usa** e **quanto você pode usar**.

---

## 13. Páginas que existem no código mas NÃO estão no menu (revisar)

Durante o mapeamento, encontrei telas que existem mas **não têm link no menu lateral** — só são acessíveis digitando a URL. Vale decidir se entram no produto, ficam escondidas ou são removidas:

| Página | Rota | O que é | Situação |
|---|---|---|---|
| **Agenda (global)** | `/dashboard/schedule` | Lista simples de todas as reservas da arena, com seletor de arena | Funcional, mas **sem link no menu**. A agenda "oficial" hoje é o calendário por espaço. Definir se reaproveita ou remove. |
| **Simulador de Inscrição** | `/dashboard/rotativo/[arenaId]/simulate` | "Área Experimental" que simula a inscrição do atleta no rotativo (como seria no app) | Ferramenta de teste/demo, **sem link no menu**. Avaliar se é só para QA. |
| **Retorno do checkout** | `/dashboard/settings/subscription/[arenaId]/checkout-return` | Tela de status após pagamento em checkout hospedado | OK — é destino de redirecionamento, não precisa de menu. |
| **Teste de banco** | `/test-db` | Página que faz `SELECT` em `estados` e imprime o JSON | **Código morto de desenvolvimento** — recomendo **remover** (igual à limpeza anterior). |

> **Observação:** as APIs internas (upload de imagem, consulta de CNPJ, webhooks de pagamento, dados do usuário/onboarding) também existem, mas são "bastidores" — não são telas que o gestor acessa diretamente, então não entram neste guia.

---

## Cobertura deste guia

Para sua revisão, o guia cobre **todas as áreas acessíveis pelo menu**: Dashboard, Espaços (agenda/reservas), Atletas, Estações/Comandas, Catálogo/Estoque, Mensalistas, Rotativo, Fidelidade (incl. extrato e ranking), Financeiro, Relatórios (pagamentos e clientes) e Configurações (Usuários, Assinatura, Perfil da Arena) — além do fluxo de acesso/cadastro e do tutorial inicial.

As únicas coisas **fora** do guia principal são as 4 páginas listadas na seção 13 (órfãs/experimentais/teste) e as APIs de bastidores.
