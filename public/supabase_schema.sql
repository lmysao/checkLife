-- ============================================================
-- RITUAL DIÁRIO — Schema completo do Supabase
-- ============================================================
-- Execute este arquivo no SQL Editor do Supabase.
-- Ele cria TODAS as tabelas necessárias (originais + novas de nutrição)
-- e as políticas de RLS que permitem acesso pela anon key pública.
--
-- ⚠️  AVISO DE SEGURANÇA:
-- Como o app usa apenas a ANON KEY pública (sem login de usuário),
-- estas políticas permitem leitura/escrita para qualquer pessoa que
-- tenha a URL do seu projeto. Para uso pessoal isso é OK, mas NÃO
-- compartilhe a URL publicamente.
--
-- Se quiser privacidade real no futuro, adicione Supabase Auth e
-- troque a policy `TO anon` por `TO authenticated` + filtro por user_id.
-- ============================================================

-- ============================================================
-- 1) TABELAS ORIGINAIS (checklist, tasks, mood)
-- ============================================================

-- Itens de checklist (cada item de cada módulo: "Tomei banho", etc.)
create table if not exists public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  module       text not null,          -- ex: "manha", "bemestar", "custom_123"
  label        text not null,
  position     int  not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Status (marcado/desmarcado) por item + período (dia ou semana)
create table if not exists public.checklist_status (
  item_id      uuid not null references public.checklist_items(id) on delete cascade,
  period_key   text not null,          -- "2024-06-27" (dia) ou "2024-W26" (semana)
  checked      boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (item_id, period_key)
);

-- Tarefas avulsas do dia
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  done         boolean not null default false,
  position     int  not null default 0,
  day_key      text not null,          -- "2024-06-27"
  priority     text not null default 'media',  -- alta | media | baixa
  created_at   timestamptz not null default now()
);

-- Registro de humor diário
create table if not exists public.mood_log (
  day_key      text primary key,       -- "2024-06-27"
  value        int  not null,          -- 1..5
  note         text,
  updated_at   timestamptz not null default now()
);


-- ============================================================
-- 2) NOVAS TABELAS — NUTRIÇÃO
-- ============================================================

-- Hidratação: copos por dia
create table if not exists public.water_log (
  day_key      text primary key,       -- "2024-06-27"
  count        int  not null default 0,
  updated_at   timestamptz not null default now()
);

-- Macros consumidos por dia (em gramas)
create table if not exists public.macros_log (
  day_key      text primary key,       -- "2024-06-27"
  carbs        int  not null default 0,
  protein      int  not null default 0,
  fat          int  not null default 0,
  updated_at   timestamptz not null default now()
);

-- Pirâmide alimentar: porções por grupo, por dia
-- counts é um JSON: { "g_frutas": 2, "g_cereai": 1, ... }
create table if not exists public.pyramid_log (
  day_key      text primary key,       -- "2024-06-27"
  counts       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Configurações de nutrição (linha única, id=1)
-- Armazena peso, tamanho do copo, metas de macros e grupos da pirâmide
create table if not exists public.nutrition_settings (
  id           int primary key default 1,
  settings     jsonb not null,
  updated_at   timestamptz not null default now(),
  constraint nutrition_settings_singleton check (id = 1)
);
insert into public.nutrition_settings (id, settings)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Gratidão diária (3 coisas boas)
create table if not exists public.gratitude_log (
  day_key      text primary key,       -- "2024-06-27"
  items        jsonb not null default '[]'::jsonb,  -- ["coisa 1","coisa 2","coisa 3"]
  updated_at   timestamptz not null default now()
);

-- Módulos customizados criados pelo usuário
create table if not exists public.custom_modules (
  key          text primary key,       -- "custom_1719483200000"
  label        text not null,
  accent       text not null,          -- "#C1502E"
  created_at   timestamptz not null default now()
);


-- ============================================================
-- 3) ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Habilita RLS em todas as tabelas e permite acesso anônimo total.
-- Como o app não tem login, qualquer dispositivo com a URL+anon key
-- pode ler e escrever. Os dados são compartilhados entre todos os
-- dispositivos que usam o mesmo projeto Supabase (que é o objetivo:
-- sincronizar entre celular, notebook, etc.).

alter table public.checklist_items   enable row level security;
alter table public.checklist_status  enable row level security;
alter table public.tasks             enable row level security;
alter table public.mood_log          enable row level security;
alter table public.water_log         enable row level security;
alter table public.macros_log        enable row level security;
alter table public.pyramid_log       enable row level security;
alter table public.nutrition_settings enable row level security;
alter table public.gratitude_log     enable row level security;
alter table public.custom_modules    enable row level security;

-- Helper: cria policies permissivas para uma tabela (todas as operações para anon)
-- O Supabase não tem loop direto no SQL editor, então repetimos por tabela.

-- checklist_items
drop policy if exists "anon_read_checklist_items"  on public.checklist_items;
drop policy if exists "anon_write_checklist_items" on public.checklist_items;
create policy "anon_read_checklist_items"  on public.checklist_items for select to anon using (true);
create policy "anon_write_checklist_items" on public.checklist_items for all    to anon using (true) with check (true);

-- checklist_status
drop policy if exists "anon_rw_checklist_status" on public.checklist_status;
create policy "anon_rw_checklist_status" on public.checklist_status for all to anon using (true) with check (true);

-- tasks
drop policy if exists "anon_rw_tasks" on public.tasks;
create policy "anon_rw_tasks" on public.tasks for all to anon using (true) with check (true);

-- mood_log
drop policy if exists "anon_rw_mood_log" on public.mood_log;
create policy "anon_rw_mood_log" on public.mood_log for all to anon using (true) with check (true);

-- water_log
drop policy if exists "anon_rw_water_log" on public.water_log;
create policy "anon_rw_water_log" on public.water_log for all to anon using (true) with check (true);

-- macros_log
drop policy if exists "anon_rw_macros_log" on public.macros_log;
create policy "anon_rw_macros_log" on public.macros_log for all to anon using (true) with check (true);

-- pyramid_log
drop policy if exists "anon_rw_pyramid_log" on public.pyramid_log;
create policy "anon_rw_pyramid_log" on public.pyramid_log for all to anon using (true) with check (true);

-- nutrition_settings
drop policy if exists "anon_rw_nutrition_settings" on public.nutrition_settings;
create policy "anon_rw_nutrition_settings" on public.nutrition_settings for all to anon using (true) with check (true);

-- gratitude_log
drop policy if exists "anon_rw_gratitude_log" on public.gratitude_log;
create policy "anon_rw_gratitude_log" on public.gratitude_log for all to anon using (true) with check (true);

-- custom_modules
drop policy if exists "anon_rw_custom_modules" on public.custom_modules;
create policy "anon_rw_custom_modules" on public.custom_modules for all to anon using (true) with check (true);


-- ============================================================
-- 4) ÍNDICES (para performance em consultas por dia)
-- ============================================================
create index if not exists idx_checklist_items_module   on public.checklist_items(module);
create index if not exists idx_checklist_status_period   on public.checklist_status(period_key);
create index if not exists idx_tasks_day_key             on public.tasks(day_key);
create index if not exists idx_water_log_day             on public.water_log(day_key);
create index if not exists idx_macros_log_day            on public.macros_log(day_key);
create index if not exists idx_pyramid_log_day           on public.pyramid_log(day_key);
create index if not exists idx_gratitude_log_day         on public.gratitude_log(day_key);


-- ============================================================
-- ✅ PRONTO!
-- Agora o app vai sincronizar entre dispositivos:
--   - Checklist, tarefas e humor (já funcionavam)
--   - Hidratação, macros, pirâmide, gratidão, módulos custom
--   - Configurações de nutrição (peso, metas, grupos da pirâmide)
-- ============================================================
