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
  );
$$;

grant execute on function desativar_matriculas_vencidas() to authenticated;
grant execute on function aluno_acesso_liberado(uuid) to authenticated;
