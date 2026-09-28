-- =====================================================================
-- Controle de Presença — Reunião de Obreiros
-- Estrutura do banco no Supabase.
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- Pode ser executado mais de uma vez sem problemas.
-- =====================================================================

-- Uma única linha guarda o estado compartilhado:
--   dados.chamada   → chamada da reunião atual (zerada a cada nova reunião)
--   dados.obreiros  → cadastro de obreiros (mantido entre reuniões)
-- A coluna "versao" impede que dois aparelhos sobrescrevam um ao outro.
create table if not exists public.estado_compartilhado (
  id            integer primary key default 1 check (id = 1),
  versao        bigint      not null default 0,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

insert into public.estado_compartilhado (id, versao, dados)
values (1, 0, '{"chamada": null, "obreiros": [], "opsAplicadas": [], "chamadasEncerradas": []}'::jsonb)
on conflict (id) do nothing;

-- Permissões explícitas (necessárias quando "Automatically expose new tables"
-- está desativado no projeto):
--   anon / authenticated → somente leitura (tempo real no navegador)
--   service_role         → leitura e gravação (servidor do sistema)
revoke all on public.estado_compartilhado from anon, authenticated;
grant select on public.estado_compartilhado to anon, authenticated;
grant select, insert, update on public.estado_compartilhado to service_role;

-- Segurança: o navegador (chave "anon") só pode LER, para receber as
-- atualizações em tempo real. Todas as alterações passam pelo servidor
-- do sistema (Render), que usa a chave "service_role" e valida cada operação.
alter table public.estado_compartilhado enable row level security;

drop policy if exists "leitura publica do estado" on public.estado_compartilhado;
create policy "leitura publica do estado"
  on public.estado_compartilhado
  for select
  to anon, authenticated
  using (true);

-- Tempo real: avisa todos os aparelhos a cada alteração.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'estado_compartilhado'
  ) then
    alter publication supabase_realtime add table public.estado_compartilhado;
  end if;
end $$;
