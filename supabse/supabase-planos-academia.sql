create table if not exists planos_academia (
  nome varchar(50) primary key,
  meses integer not null check (meses > 0),
  valor numeric(10, 2) not null check (valor >= 0),
  desconto varchar(50) not null default 'Sem desconto',
  status varchar(20) not null default 'ATIVO' check (status in ('ATIVO', 'INATIVO')),
  ordem integer not null default 1,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table planos_academia enable row level security;

grant select, insert, update, delete on planos_academia to authenticated;

drop policy if exists "Usuarios autenticados podem ver planos" on planos_academia;
drop policy if exists "Usuarios autenticados podem editar planos" on planos_academia;

create policy "Usuarios autenticados podem ver planos"
on planos_academia
for select
to authenticated
using (true);

create policy "Usuarios autenticados podem editar planos"
on planos_academia
for all
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.tipo_usuario = 'ADMIN'
      and profiles.status = 'ATIVO'
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.tipo_usuario = 'ADMIN'
      and profiles.status = 'ATIVO'
  )
);

insert into planos_academia (nome, meses, valor, desconto, status, ordem)
values
  ('Mensal', 1, 80.00, 'Sem desconto', 'ATIVO', 1),
  ('Trimestral', 3, 216.00, '10%', 'ATIVO', 2),
  ('Semestral', 6, 408.00, '15%', 'ATIVO', 3)
on conflict (nome) do nothing;
