drop table if exists alunos cascade;

create table alunos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  telefone varchar(20),
  cpf varchar(14) unique not null,
  data_nascimento date,
  plano varchar(50),
  validade_matricula date,
  observacoes text,
  altura numeric(4,2),
  peso numeric(5,2),
  status varchar(20) default 'ATIVO',
  created_at timestamp default now()
);

alter table alunos enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on alunos to authenticated;

create policy "Admins autenticados podem ver alunos"
on alunos
for select
to authenticated
using (true);

create policy "Admins autenticados podem cadastrar alunos"
on alunos
for insert
to authenticated
with check (true);

create policy "Admins autenticados podem editar alunos"
on alunos
for update
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir alunos"
on alunos
for delete
to authenticated
using (true);
