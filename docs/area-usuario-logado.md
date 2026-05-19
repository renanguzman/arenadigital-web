# Área De Usuário Logado

Documento atualizado: a autenticação da web e do aplicativo é feita com Supabase Auth.

- `auth.users.id` é o mesmo identificador salvo em `public.users.id`.
- Gestores, atendentes, caixas e atletas usam o mesmo provedor de autenticação.
- O perfil operacional do atleta fica em `public.atleta`, vinculado por `atleta.id_users`.
- O CPF em `public.atleta.cpf` é o identificador único de negócio do atleta.

Consulte `AUTH.md` para o fluxo completo de login, cadastro, redefinição de senha e provisionamento.
