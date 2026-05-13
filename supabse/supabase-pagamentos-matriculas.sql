create table if not exists pagamentos_matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  plano varchar(50) not null,
  valor numeric(8,2) not null,
  forma_pagamento varchar(30) not null,
  status varchar(20) not null default 'PAGO',
  validade_anterior date,
  validade_nova date not null,
  observacoes text,
  pago_em timestamp default now(),
  created_at timestamp default now()
);

alter table pagamentos_matriculas enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on pagamentos_matriculas to authenticated;

create policy "Admins autenticados podem ver pagamentos de matriculas"
on pagamentos_matriculas
for select
to authenticated
using (true);

create policy "Admins autenticados podem registrar pagamentos de matriculas"
on pagamentos_matriculas
for insert
to authenticated
with check (true);

create policy "Admins autenticados podem editar pagamentos de matriculas"
on pagamentos_matriculas
for update
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir pagamentos de matriculas"
on pagamentos_matriculas
for delete
to authenticated
using (true);
