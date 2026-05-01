alter table arenas
  add column if not exists cpf_cnpj text;

comment on column arenas.cpf_cnpj is 'CPF ou CNPJ do titular da arena. Necessário para gateways de pagamento que exigem documento fiscal (ex: Asaas).';
