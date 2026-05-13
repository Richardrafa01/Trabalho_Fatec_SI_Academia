grant usage on schema public to authenticated;
grant select, insert, update, delete on alunos to authenticated;

alter table alunos enable row level security;

drop policy if exists "Admins autenticados podem ver alunos" on alunos;
drop policy if exists "Admins autenticados podem cadastrar alunos" on alunos;
drop policy if exists "Admins autenticados podem editar alunos" on alunos;
drop policy if exists "Admins autenticados podem excluir alunos" on alunos;

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
