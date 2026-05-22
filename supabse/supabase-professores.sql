drop table if exists professores cascade;

create table professores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  telefone varchar(20),
  cpf varchar(14) unique not null,
  data_nascimento date,
  cargo varchar(80) not null default 'Professor de musculacao',
  perfil_acesso varchar(30) not null default 'PROFESSOR',
  especialidade varchar(100) not null,
  cref varchar(30),
  valor_hora numeric(8,2),
  horarios text,
  observacoes text,
  status varchar(20) default 'ATIVO',
  acesso_criado boolean not null default false,
  acesso_criado_em timestamp,
  created_at timestamp default now()
);

alter table professores
add column if not exists cargo varchar(80) not null default 'Professor de musculacao',
add column if not exists perfil_acesso varchar(30) not null default 'PROFESSOR';

alter table professores enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on professores to authenticated;

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
