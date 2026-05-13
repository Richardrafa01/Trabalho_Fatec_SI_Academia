create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome varchar(150),
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  tipo_usuario varchar(20) not null check (tipo_usuario in ('ADMIN', 'PROFESSOR', 'ALUNO')),
  precisa_trocar_senha boolean not null default true,
  status varchar(20) not null default 'ATIVO',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists professores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  telefone varchar(20),
  cpf varchar(14) unique not null,
  data_nascimento date,
  especialidade varchar(100) not null,
  cref varchar(30),
  valor_hora numeric(8,2),
  horarios text,
  observacoes text,
  status varchar(20) not null default 'ATIVO',
  acesso_criado boolean not null default false,
  acesso_criado_em timestamp,
  created_at timestamp default now()
);

alter table profiles
add column if not exists nome varchar(150),
add column if not exists nome_completo varchar(150),
add column if not exists email varchar(150),
add column if not exists tipo_usuario varchar(20),
add column if not exists precisa_trocar_senha boolean not null default true,
add column if not exists status varchar(20) not null default 'ATIVO',
add column if not exists created_at timestamp default now(),
add column if not exists updated_at timestamp default now();

alter table professores
add column if not exists profile_id uuid references profiles(id),
add column if not exists acesso_criado boolean not null default false,
add column if not exists acesso_criado_em timestamp,
add column if not exists status varchar(20) not null default 'ATIVO';

alter table profiles enable row level security;
alter table professores enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on professores to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on profiles to service_role;
grant select, insert, update, delete on professores to service_role;

drop policy if exists "Usuarios autenticados podem ver profiles" on profiles;
drop policy if exists "Usuarios autenticados podem cadastrar profiles" on profiles;
drop policy if exists "Usuarios autenticados podem editar profiles" on profiles;
drop policy if exists "Admins autenticados podem ver professores" on professores;
drop policy if exists "Admins autenticados podem cadastrar professores" on professores;
drop policy if exists "Admins autenticados podem editar professores" on professores;
drop policy if exists "Admins autenticados podem excluir professores" on professores;

create policy "Usuarios autenticados podem ver profiles"
on profiles
for select
to authenticated
using (true);

create policy "Usuarios autenticados podem cadastrar profiles"
on profiles
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados podem editar profiles"
on profiles
for update
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem ver professores"
on professores
for select
to authenticated
using (true);

create policy "Admins autenticados podem cadastrar professores"
on professores
for insert
to authenticated
with check (true);

create policy "Admins autenticados podem editar professores"
on professores
for update
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir professores"
on professores
for delete
to authenticated
using (true);

-- Depois de criar seu usuario admin pelo Supabase Auth, cadastre ele em profiles.
-- Troque os valores abaixo pelo id, nome e e-mail reais do usuario admin.
--
-- insert into profiles (id, nome, nome_completo, email, tipo_usuario, precisa_trocar_senha, status)
-- values ('UUID_DO_USUARIO_ADMIN', 'Administrador', 'Administrador', 'admin@email.com', 'ADMIN', false, 'ATIVO')
-- on conflict (id) do update set
--   nome = excluded.nome,
--   nome_completo = excluded.nome_completo,
--   email = excluded.email,
--   tipo_usuario = excluded.tipo_usuario,
--   precisa_trocar_senha = excluded.precisa_trocar_senha,
--   status = excluded.status,
--   updated_at = now();
