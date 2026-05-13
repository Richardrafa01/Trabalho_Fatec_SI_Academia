alter table alunos
drop column if exists altura,
drop column if exists peso,
add column if not exists cep varchar(9),
add column if not exists endereco varchar(180),
add column if not exists numero varchar(20),
add column if not exists bairro varchar(100),
add column if not exists cidade varchar(100),
add column if not exists estado varchar(2),
add column if not exists complemento varchar(120);
