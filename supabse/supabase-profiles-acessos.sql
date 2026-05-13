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

alter table profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on profiles to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on profiles to service_role;
grant select, insert, update, delete on professores to service_role;

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

alter table professores
add column if not exists acesso_criado boolean not null default false,
add column if not exists acesso_criado_em timestamp;

alter table alunos
add column if not exists acesso_criado boolean not null default false,
add column if not exists acesso_criado_em timestamp;
