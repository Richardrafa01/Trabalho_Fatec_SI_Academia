create table if not exists plano_regras_acesso (
  id uuid primary key default gen_random_uuid(),
  plano varchar(50) not null references planos_academia(nome) on update cascade on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null default '00:00',
  hora_fim time not null default '23:59:59',
  ativo boolean not null default true,
  created_at timestamp default now()
);

alter table plano_regras_acesso
drop constraint if exists plano_regras_acesso_plano_fkey;

alter table plano_regras_acesso
add constraint plano_regras_acesso_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete cascade
not valid;

create index if not exists plano_regras_acesso_plano_idx on plano_regras_acesso(plano);

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

alter table plano_regras_acesso enable row level security;
alter table bloqueios_alunos enable row level security;
alter table acessos_catraca enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on plano_regras_acesso to authenticated;
grant select, insert, update, delete on bloqueios_alunos to authenticated;
grant select, insert, update, delete on acessos_catraca to authenticated;

create policy "Admins autenticados podem gerenciar regras de acesso"
on plano_regras_acesso
for all
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem gerenciar bloqueios de alunos"
on bloqueios_alunos
for all
to authenticated
using (true)
with check (true);

create policy "Admins autenticados podem ver e registrar acessos"
on acessos_catraca
for all
to authenticated
using (true)
with check (true);

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
  values (aluno_record.id, liberado_resultado, status_resultado, motivo_resultado, coalesce(p_origem, 'CATRACA'));

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

grant execute on function registrar_acesso_catraca(uuid, varchar) to authenticated;
grant execute on function aluno_acesso_liberado(uuid) to authenticated;
