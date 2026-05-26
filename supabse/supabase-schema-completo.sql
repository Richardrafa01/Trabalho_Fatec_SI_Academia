-- ============================================================
-- Sistema Academia - Banco de dados completo para Supabase
-- Rode este arquivo no SQL Editor do Supabase.
--
-- Observacao:
-- A tabela "professores" tambem representa funcionarios/equipe no sistema.
-- O nome foi mantido para continuar compativel com o codigo atual.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Profiles / usuarios do sistema
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome varchar(150),
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  tipo_usuario varchar(30) not null,
  precisa_trocar_senha boolean not null default true,
  status varchar(20) not null default 'ATIVO',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table profiles
add column if not exists nome varchar(150),
add column if not exists nome_completo varchar(150),
add column if not exists email varchar(150),
add column if not exists tipo_usuario varchar(30),
add column if not exists precisa_trocar_senha boolean not null default true,
add column if not exists status varchar(20) not null default 'ATIVO',
add column if not exists created_at timestamp default now(),
add column if not exists updated_at timestamp default now();

alter table profiles
drop constraint if exists profiles_tipo_usuario_check;

alter table profiles
add constraint profiles_tipo_usuario_check
check (tipo_usuario in ('ADMIN', 'GERENTE', 'ADMINISTRATIVO', 'RECEPCAO', 'PROFESSOR', 'ALUNO'));

alter table profiles
drop constraint if exists profiles_status_check;

alter table profiles
add constraint profiles_status_check
check (status in ('ATIVO', 'INATIVO', 'BLOQUEADO'));

create unique index if not exists profiles_email_unique on profiles(email);

-- ============================================================
-- Funcionarios / professores / recepcao / administrativo
-- ============================================================

create table if not exists professores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
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
  status varchar(20) not null default 'ATIVO',
  acesso_criado boolean not null default false,
  acesso_criado_em timestamp,
  created_at timestamp default now()
);

alter table professores
add column if not exists profile_id uuid references profiles(id) on delete set null,
add column if not exists nome_completo varchar(150),
add column if not exists email varchar(150),
add column if not exists telefone varchar(20),
add column if not exists cpf varchar(14),
add column if not exists data_nascimento date,
add column if not exists cargo varchar(80) not null default 'Professor de musculacao',
add column if not exists perfil_acesso varchar(30) not null default 'PROFESSOR',
add column if not exists especialidade varchar(100),
add column if not exists cref varchar(30),
add column if not exists valor_hora numeric(8,2),
add column if not exists horarios text,
add column if not exists observacoes text,
add column if not exists status varchar(20) not null default 'ATIVO',
add column if not exists acesso_criado boolean not null default false,
add column if not exists acesso_criado_em timestamp,
add column if not exists created_at timestamp default now();

alter table professores
drop constraint if exists professores_perfil_acesso_check;

alter table professores
add constraint professores_perfil_acesso_check
check (perfil_acesso in ('ADMIN', 'GERENTE', 'ADMINISTRATIVO', 'RECEPCAO', 'PROFESSOR'));

alter table professores
drop constraint if exists professores_status_check;

alter table professores
add constraint professores_status_check
check (status in ('ATIVO', 'INATIVO', 'BLOQUEADO'));

create unique index if not exists professores_email_unique on professores(email);
create unique index if not exists professores_cpf_unique on professores(cpf);
create index if not exists professores_profile_id_idx on professores(profile_id);

-- ============================================================
-- Alunos
-- ============================================================

create table if not exists alunos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  nome_completo varchar(150) not null,
  email varchar(150) unique not null,
  telefone varchar(20),
  cpf varchar(14) unique not null,
  data_nascimento date,
  plano varchar(50),
  validade_matricula date,
  cep varchar(9),
  endereco varchar(180),
  numero varchar(20),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(2),
  complemento varchar(120),
  observacoes text,
  status varchar(20) not null default 'ATIVO',
  acesso_criado boolean not null default false,
  acesso_criado_em timestamp,
  created_at timestamp default now()
);

alter table alunos
drop column if exists altura,
drop column if exists peso,
add column if not exists profile_id uuid references profiles(id) on delete set null,
add column if not exists nome_completo varchar(150),
add column if not exists email varchar(150),
add column if not exists telefone varchar(20),
add column if not exists cpf varchar(14),
add column if not exists data_nascimento date,
add column if not exists plano varchar(50),
add column if not exists validade_matricula date,
add column if not exists cep varchar(9),
add column if not exists endereco varchar(180),
add column if not exists numero varchar(20),
add column if not exists bairro varchar(100),
add column if not exists cidade varchar(100),
add column if not exists estado varchar(2),
add column if not exists complemento varchar(120),
add column if not exists observacoes text,
add column if not exists status varchar(20) not null default 'ATIVO',
add column if not exists acesso_criado boolean not null default false,
add column if not exists acesso_criado_em timestamp,
add column if not exists created_at timestamp default now();

alter table alunos
drop constraint if exists alunos_status_check;

alter table alunos
add constraint alunos_status_check
check (status in ('ATIVO', 'INATIVO', 'BLOQUEADO'));

create unique index if not exists alunos_email_unique on alunos(email);
create unique index if not exists alunos_cpf_unique on alunos(cpf);
create index if not exists alunos_profile_id_idx on alunos(profile_id);
create index if not exists alunos_status_idx on alunos(status);
create index if not exists alunos_plano_idx on alunos(plano);

-- ============================================================
-- Planos da academia
-- O plano Mensal e a base. Os outros valores sao calculados pelo sistema.
-- ============================================================

create table if not exists planos_academia (
  nome varchar(50) primary key,
  meses integer not null check (meses > 0),
  valor numeric(10,2) not null check (valor >= 0),
  desconto varchar(50) not null default 'Sem desconto',
  status varchar(20) not null default 'ATIVO',
  ordem integer not null default 1,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table planos_academia
add column if not exists meses integer not null default 1,
add column if not exists valor numeric(10,2) not null default 0,
add column if not exists desconto varchar(50) not null default 'Sem desconto',
add column if not exists status varchar(20) not null default 'ATIVO',
add column if not exists ordem integer not null default 1,
add column if not exists created_at timestamp default now(),
add column if not exists updated_at timestamp default now();

alter table planos_academia
drop constraint if exists planos_academia_status_check;

alter table planos_academia
add constraint planos_academia_status_check
check (status in ('ATIVO', 'INATIVO'));

insert into planos_academia (nome, meses, valor, desconto, status, ordem)
values
  ('Mensal', 1, 80.00, 'Sem desconto', 'ATIVO', 1),
  ('Trimestral', 3, 216.00, '10%', 'ATIVO', 2),
  ('Semestral', 6, 408.00, '15%', 'ATIVO', 3)
on conflict (nome) do nothing;

alter table alunos
drop constraint if exists alunos_plano_fkey;

alter table alunos
add constraint alunos_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete restrict
not valid;

-- ============================================================
-- Pagamentos / renovacoes de matricula
-- ============================================================

create table if not exists pagamentos_matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  plano varchar(50) not null references planos_academia(nome) on update cascade on delete restrict,
  valor numeric(8,2) not null,
  forma_pagamento varchar(30) not null,
  status varchar(20) not null default 'PAGO',
  validade_anterior date,
  validade_nova date not null,
  observacoes text,
  pago_em timestamp default now(),
  created_at timestamp default now()
);

alter table pagamentos_matriculas
add column if not exists aluno_id uuid references alunos(id) on delete cascade,
add column if not exists plano varchar(50),
add column if not exists valor numeric(8,2),
add column if not exists forma_pagamento varchar(30),
add column if not exists status varchar(20) not null default 'PAGO',
add column if not exists validade_anterior date,
add column if not exists validade_nova date,
add column if not exists observacoes text,
add column if not exists pago_em timestamp default now(),
add column if not exists created_at timestamp default now();

alter table pagamentos_matriculas
drop constraint if exists pagamentos_matriculas_status_check;

alter table pagamentos_matriculas
add constraint pagamentos_matriculas_status_check
check (status in ('PAGO', 'PENDENTE', 'CANCELADO'));

alter table pagamentos_matriculas
drop constraint if exists pagamentos_matriculas_plano_fkey;

alter table pagamentos_matriculas
add constraint pagamentos_matriculas_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete restrict
not valid;

create index if not exists pagamentos_matriculas_aluno_id_idx on pagamentos_matriculas(aluno_id);
create index if not exists pagamentos_matriculas_plano_idx on pagamentos_matriculas(plano);
create index if not exists pagamentos_matriculas_pago_em_idx on pagamentos_matriculas(pago_em);

-- ============================================================
-- Regras de acesso, bloqueios e catraca
-- ============================================================

create table if not exists plano_regras_acesso (
  id uuid primary key default gen_random_uuid(),
  plano varchar(50) not null references planos_academia(nome) on update cascade on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null default '00:00',
  hora_fim time not null default '23:59:59',
  ativo boolean not null default true,
  created_at timestamp default now()
);

create table if not exists bloqueios_alunos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  motivo text not null,
  ativo boolean not null default true,
  bloqueado_em timestamp default now(),
  bloqueado_ate timestamp,
  created_at timestamp default now()
);

create table if not exists acessos_catraca (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete set null,
  liberado boolean not null default false,
  status varchar(20) not null,
  motivo text,
  origem varchar(30) not null default 'CATRACA',
  registrado_em timestamp default now(),
  created_at timestamp default now()
);

alter table plano_regras_acesso
add column if not exists plano varchar(50),
add column if not exists dia_semana smallint,
add column if not exists hora_inicio time not null default '00:00',
add column if not exists hora_fim time not null default '23:59:59',
add column if not exists ativo boolean not null default true,
add column if not exists created_at timestamp default now();

alter table plano_regras_acesso
drop constraint if exists plano_regras_acesso_plano_fkey;

alter table plano_regras_acesso
add constraint plano_regras_acesso_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete cascade
not valid;

alter table bloqueios_alunos
add column if not exists aluno_id uuid references alunos(id) on delete cascade,
add column if not exists motivo text,
add column if not exists ativo boolean not null default true,
add column if not exists bloqueado_em timestamp default now(),
add column if not exists bloqueado_ate timestamp,
add column if not exists created_at timestamp default now();

alter table acessos_catraca
add column if not exists aluno_id uuid references alunos(id) on delete set null,
add column if not exists liberado boolean not null default false,
add column if not exists status varchar(20),
add column if not exists motivo text,
add column if not exists origem varchar(30) not null default 'CATRACA',
add column if not exists registrado_em timestamp default now(),
add column if not exists created_at timestamp default now();

alter table acessos_catraca
drop constraint if exists acessos_catraca_status_check;

alter table acessos_catraca
add constraint acessos_catraca_status_check
check (status in ('LIBERADO', 'BLOQUEADO'));

create index if not exists plano_regras_acesso_plano_idx on plano_regras_acesso(plano);
create index if not exists bloqueios_alunos_aluno_id_idx on bloqueios_alunos(aluno_id);
create index if not exists acessos_catraca_aluno_id_idx on acessos_catraca(aluno_id);
create index if not exists acessos_catraca_registrado_em_idx on acessos_catraca(registrado_em);

insert into plano_regras_acesso (plano, dia_semana, hora_inicio, hora_fim)
select plano, dia_semana, '00:00'::time, '23:59:59'::time
from (
  values ('Mensal'), ('Trimestral'), ('Semestral')
) as planos(plano)
cross join generate_series(0, 6) as dias(dia_semana)
where not exists (
  select 1
  from plano_regras_acesso regras
  where regras.plano = planos.plano
    and regras.dia_semana = dias.dia_semana
);

-- ============================================================
-- Funcoes auxiliares
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row
execute function set_updated_at();

drop trigger if exists planos_academia_set_updated_at on planos_academia;
create trigger planos_academia_set_updated_at
before update on planos_academia
for each row
execute function set_updated_at();

create or replace function desativar_matriculas_vencidas()
returns void
language sql
security definer
as $$
  update alunos
  set status = 'INATIVO'
  where status = 'ATIVO'
    and validade_matricula is not null
    and validade_matricula < current_date;
$$;

create or replace function registrar_acesso_catraca(
  p_aluno_id uuid,
  p_origem varchar default 'CATRACA'
)
returns table (
  liberado boolean,
  status varchar,
  motivo text,
  aluno_id uuid,
  nome_completo varchar
)
language plpgsql
security definer
as $$
declare
  aluno_record alunos%rowtype;
  bloqueio_record bloqueios_alunos%rowtype;
  acesso_permitido boolean;
  motivo_resultado text;
  status_resultado varchar;
  liberado_resultado boolean;
begin
  perform desativar_matriculas_vencidas();

  select *
  into aluno_record
  from alunos
  where id = p_aluno_id;

  if not found then
    liberado_resultado := false;
    status_resultado := 'BLOQUEADO';
    motivo_resultado := 'Aluno nao encontrado.';
  elsif aluno_record.status <> 'ATIVO' then
    liberado_resultado := false;
    status_resultado := 'BLOQUEADO';
    motivo_resultado := 'Aluno inativo.';
  elsif aluno_record.validade_matricula is not null and aluno_record.validade_matricula < current_date then
    liberado_resultado := false;
    status_resultado := 'BLOQUEADO';
    motivo_resultado := 'Mensalidade vencida.';
  else
    select *
    into bloqueio_record
    from bloqueios_alunos
    where bloqueios_alunos.aluno_id = aluno_record.id
      and bloqueios_alunos.ativo = true
      and (bloqueios_alunos.bloqueado_ate is null or bloqueios_alunos.bloqueado_ate > now())
    order by bloqueios_alunos.created_at desc
    limit 1;

    if found then
      liberado_resultado := false;
      status_resultado := 'BLOQUEADO';
      motivo_resultado := 'Bloqueio manual: ' || bloqueio_record.motivo;
    else
      select exists (
        select 1
        from plano_regras_acesso regra
        where regra.plano = aluno_record.plano
          and regra.ativo = true
          and regra.dia_semana = extract(dow from now())::smallint
          and localtime between regra.hora_inicio and regra.hora_fim
      )
      into acesso_permitido;

      if not acesso_permitido then
        liberado_resultado := false;
        status_resultado := 'BLOQUEADO';
        motivo_resultado := 'Plano nao permite acesso hoje ou neste horario.';
      else
        liberado_resultado := true;
        status_resultado := 'LIBERADO';
        motivo_resultado := 'Acesso liberado.';
      end if;
    end if;
  end if;

  insert into acessos_catraca (aluno_id, liberado, status, motivo, origem)
  values (
    aluno_record.id,
    liberado_resultado,
    status_resultado,
    motivo_resultado,
    coalesce(p_origem, 'CATRACA')
  );

  return query
  select
    liberado_resultado,
    status_resultado,
    motivo_resultado,
    aluno_record.id,
    aluno_record.nome_completo;
end;
$$;

create or replace function aluno_acesso_liberado(aluno_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from alunos aluno
    where aluno.id = aluno_uuid
      and aluno.status = 'ATIVO'
      and (aluno.validade_matricula is null or aluno.validade_matricula >= current_date)
      and not exists (
        select 1
        from bloqueios_alunos bloqueio
        where bloqueio.aluno_id = aluno.id
          and bloqueio.ativo = true
          and (bloqueio.bloqueado_ate is null or bloqueio.bloqueado_ate > now())
      )
      and exists (
        select 1
        from plano_regras_acesso regra
        where regra.plano = aluno.plano
          and regra.ativo = true
          and regra.dia_semana = extract(dow from now())::smallint
          and localtime between regra.hora_inicio and regra.hora_fim
      )
  );
$$;

-- ============================================================
-- Row Level Security e permissoes
-- ============================================================

alter table profiles enable row level security;
alter table professores enable row level security;
alter table alunos enable row level security;
alter table planos_academia enable row level security;
alter table pagamentos_matriculas enable row level security;
alter table plano_regras_acesso enable row level security;
alter table bloqueios_alunos enable row level security;
alter table acessos_catraca enable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on professores to authenticated;
grant select, insert, update, delete on alunos to authenticated;
grant select, insert, update, delete on planos_academia to authenticated;
grant select, insert, update, delete on pagamentos_matriculas to authenticated;
grant select, insert, update, delete on plano_regras_acesso to authenticated;
grant select, insert, update, delete on bloqueios_alunos to authenticated;
grant select, insert, update, delete on acessos_catraca to authenticated;

grant select, insert, update, delete on profiles to service_role;
grant select, insert, update, delete on professores to service_role;
grant select, insert, update, delete on alunos to service_role;
grant select, insert, update, delete on planos_academia to service_role;
grant select, insert, update, delete on pagamentos_matriculas to service_role;
grant select, insert, update, delete on plano_regras_acesso to service_role;
grant select, insert, update, delete on bloqueios_alunos to service_role;
grant select, insert, update, delete on acessos_catraca to service_role;

grant execute on function desativar_matriculas_vencidas() to authenticated, service_role;
grant execute on function registrar_acesso_catraca(uuid, varchar) to authenticated, service_role;
grant execute on function aluno_acesso_liberado(uuid) to authenticated, service_role;

drop policy if exists "Usuarios autenticados podem ver profiles" on profiles;
drop policy if exists "Usuarios autenticados podem cadastrar profiles" on profiles;
drop policy if exists "Usuarios autenticados podem editar profiles" on profiles;

create policy "Usuarios autenticados podem ver profiles"
on profiles for select to authenticated
using (true);

create policy "Usuarios autenticados podem cadastrar profiles"
on profiles for insert to authenticated
with check (true);

create policy "Usuarios autenticados podem editar profiles"
on profiles for update to authenticated
using (true)
with check (true);

drop policy if exists "Admins autenticados podem ver professores" on professores;
drop policy if exists "Admins autenticados podem cadastrar professores" on professores;
drop policy if exists "Admins autenticados podem editar professores" on professores;
drop policy if exists "Admins autenticados podem excluir professores" on professores;

create policy "Admins autenticados podem ver professores"
on professores for select to authenticated
using (true);

create policy "Admins autenticados podem cadastrar professores"
on professores for insert to authenticated
with check (true);

create policy "Admins autenticados podem editar professores"
on professores for update to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir professores"
on professores for delete to authenticated
using (true);

drop policy if exists "Admins autenticados podem ver alunos" on alunos;
drop policy if exists "Admins autenticados podem cadastrar alunos" on alunos;
drop policy if exists "Admins autenticados podem editar alunos" on alunos;
drop policy if exists "Admins autenticados podem excluir alunos" on alunos;

create policy "Admins autenticados podem ver alunos"
on alunos for select to authenticated
using (true);

create policy "Admins autenticados podem cadastrar alunos"
on alunos for insert to authenticated
with check (true);

create policy "Admins autenticados podem editar alunos"
on alunos for update to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir alunos"
on alunos for delete to authenticated
using (true);

drop policy if exists "Usuarios autenticados podem ver planos" on planos_academia;
drop policy if exists "Usuarios autenticados podem editar planos" on planos_academia;

create policy "Usuarios autenticados podem ver planos"
on planos_academia for select to authenticated
using (true);

create policy "Usuarios autenticados podem editar planos"
on planos_academia for all to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.tipo_usuario in ('ADMIN', 'GERENTE')
      and profiles.status = 'ATIVO'
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.tipo_usuario in ('ADMIN', 'GERENTE')
      and profiles.status = 'ATIVO'
  )
);

drop policy if exists "Admins autenticados podem ver pagamentos de matriculas" on pagamentos_matriculas;
drop policy if exists "Admins autenticados podem registrar pagamentos de matriculas" on pagamentos_matriculas;
drop policy if exists "Admins autenticados podem editar pagamentos de matriculas" on pagamentos_matriculas;
drop policy if exists "Admins autenticados podem excluir pagamentos de matriculas" on pagamentos_matriculas;

create policy "Admins autenticados podem ver pagamentos de matriculas"
on pagamentos_matriculas for select to authenticated
using (true);

create policy "Admins autenticados podem registrar pagamentos de matriculas"
on pagamentos_matriculas for insert to authenticated
with check (true);

create policy "Admins autenticados podem editar pagamentos de matriculas"
on pagamentos_matriculas for update to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem excluir pagamentos de matriculas"
on pagamentos_matriculas for delete to authenticated
using (true);

drop policy if exists "Admins autenticados podem gerenciar regras de acesso" on plano_regras_acesso;
drop policy if exists "Admins autenticados podem gerenciar bloqueios de alunos" on bloqueios_alunos;
drop policy if exists "Admins autenticados podem ver e registrar acessos" on acessos_catraca;

create policy "Admins autenticados podem gerenciar regras de acesso"
on plano_regras_acesso for all to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem gerenciar bloqueios de alunos"
on bloqueios_alunos for all to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem ver e registrar acessos"
on acessos_catraca for all to authenticated
using (true)
with check (true);
