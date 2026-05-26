-- ============================================================
-- Ligacoes entre tabelas existentes
-- Rode este arquivo em bancos que ja foram criados para adicionar
-- foreign keys sem precisar recriar o schema inteiro.
-- ============================================================

-- Alunos -> Profiles
alter table alunos
drop constraint if exists alunos_profile_id_fkey;

alter table alunos
add constraint alunos_profile_id_fkey
foreign key (profile_id)
references profiles(id)
on delete set null
not valid;

-- Professores -> Profiles
alter table professores
drop constraint if exists professores_profile_id_fkey;

alter table professores
add constraint professores_profile_id_fkey
foreign key (profile_id)
references profiles(id)
on delete set null
not valid;

-- Alunos -> Planos
alter table alunos
drop constraint if exists alunos_plano_fkey;

alter table alunos
add constraint alunos_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete restrict
not valid;

-- Pagamentos / matriculas -> Alunos
alter table pagamentos_matriculas
drop constraint if exists pagamentos_matriculas_aluno_id_fkey;

alter table pagamentos_matriculas
add constraint pagamentos_matriculas_aluno_id_fkey
foreign key (aluno_id)
references alunos(id)
on delete cascade
not valid;

-- Pagamentos / matriculas -> Planos
alter table pagamentos_matriculas
drop constraint if exists pagamentos_matriculas_plano_fkey;

alter table pagamentos_matriculas
add constraint pagamentos_matriculas_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete restrict
not valid;

-- Regras de acesso -> Planos
alter table plano_regras_acesso
drop constraint if exists plano_regras_acesso_plano_fkey;

alter table plano_regras_acesso
add constraint plano_regras_acesso_plano_fkey
foreign key (plano)
references planos_academia(nome)
on update cascade
on delete cascade
not valid;

-- Bloqueios -> Alunos
alter table bloqueios_alunos
drop constraint if exists bloqueios_alunos_aluno_id_fkey;

alter table bloqueios_alunos
add constraint bloqueios_alunos_aluno_id_fkey
foreign key (aluno_id)
references alunos(id)
on delete cascade
not valid;

-- Acessos da catraca -> Alunos
alter table acessos_catraca
drop constraint if exists acessos_catraca_aluno_id_fkey;

alter table acessos_catraca
add constraint acessos_catraca_aluno_id_fkey
foreign key (aluno_id)
references alunos(id)
on delete set null
not valid;

-- Indices para consultas e joins
create index if not exists alunos_profile_id_idx on alunos(profile_id);
create index if not exists alunos_plano_idx on alunos(plano);
create index if not exists professores_profile_id_idx on professores(profile_id);
create index if not exists pagamentos_matriculas_aluno_id_idx on pagamentos_matriculas(aluno_id);
create index if not exists pagamentos_matriculas_plano_idx on pagamentos_matriculas(plano);
create index if not exists plano_regras_acesso_plano_idx on plano_regras_acesso(plano);
create index if not exists bloqueios_alunos_aluno_id_idx on bloqueios_alunos(aluno_id);
create index if not exists acessos_catraca_aluno_id_idx on acessos_catraca(aluno_id);
