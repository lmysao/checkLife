-- ============================================================
-- RITUAL DIÁRIO — Migração v2 (Next.js + SQLite local + Supabase backup)
-- ============================================================
-- Execute este arquivo no SQL Editor do Supabase.
-- Ele atualiza as tabelas existentes e cria novas para suportar
-- a sincronização com o app Next.js.
--
-- Este script é IDEMPOTENTE (pode ser executado várias vezes).
-- ============================================================

-- ============================================================
-- 1) ALTERAR TABELAS EXISTENTES: UUID → TEXT
--    Permite que o novo app (que usa CUID como ID) grave nas
--    mesmas tabelas que o app antigo (que usava UUID).
-- ============================================================

-- checklist_items: id uuid → text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'id' AND data_type = 'uuid') THEN
    ALTER TABLE public.checklist_items ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

-- checklist_status: item_id uuid → text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_status' AND column_name = 'item_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.checklist_status ALTER COLUMN item_id TYPE text USING item_id::text;
  END IF;
END $$;

-- tasks: id uuid → text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'id' AND data_type = 'uuid') THEN
    ALTER TABLE public.tasks ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

-- ============================================================
-- 2) NOVAS TABELAS (modelos que não existiam no app antigo)
-- ============================================================

-- Módulos (inclui built-in + custom)
create table if not exists public.v2_modules (
  key         text primary key,
  label       text not null,
  accent      text not null default '#C1502E',
  kind        text not null default 'checklist',
  period      text not null default 'day',
  builtin     boolean not null default false,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Grupos de módulos
create table if not exists public.v2_module_groups (
  id          text primary key,
  name        text not null,
  position    int  not null default 0,
  stacked     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Itens dentro de grupos
create table if not exists public.v2_module_group_items (
  id          text primary key,
  group_id    text not null references public.v2_module_groups(id) on delete cascade,
  module_key  text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  unique(group_id, module_key)
);

-- Checklist Status (nova tabela com PK textual para nova versão)
create table if not exists public.v2_checklist_status (
  item_id     text not null,
  period_key  text not null,
  checked     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (item_id, period_key)
);

-- Momentos de humor (time-based, novo na v2)
create table if not exists public.v2_mood_moments (
  id          text primary key,
  day_key     text not null,
  time        text not null,
  value       int  not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Mood Dailies (nova tabela para daily self-assessment)
create table if not exists public.mood_dailies (
  day_key     text primary key,
  value       int  not null,
  note        text,
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 3) MIGRAR DADOS ANTIGOS PARA NOVAS TABELAS
-- ============================================================

-- Copiar mood_log → mood_dailies
INSERT INTO public.mood_dailies (day_key, value, note, updated_at)
SELECT day_key, value, note, updated_at FROM public.mood_log
ON CONFLICT (day_key) DO NOTHING;

-- Copiar checklist_status → v2_checklist_status
INSERT INTO public.v2_checklist_status (item_id, period_key, checked, updated_at)
SELECT item_id, period_key, checked, updated_at FROM public.checklist_status
ON CONFLICT (item_id, period_key) DO NOTHING;

-- Copiar custom_modules → v2_modules
INSERT INTO public.v2_modules (key, label, accent, created_at)
SELECT key, label, accent, created_at FROM public.custom_modules
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4) ROW LEVEL SECURITY (RLS) para novas tabelas
-- ============================================================

alter table public.v2_modules            enable row level security;
alter table public.v2_module_groups      enable row level security;
alter table public.v2_module_group_items enable row level security;
alter table public.v2_checklist_status   enable row level security;
alter table public.v2_mood_moments       enable row level security;
alter table public.mood_dailies          enable row level security;

-- v2_modules
DO $$ BEGIN
  CREATE POLICY "anon_all_v2_modules" ON public.v2_modules FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- v2_module_groups
DO $$ BEGIN
  CREATE POLICY "anon_all_v2_module_groups" ON public.v2_module_groups FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- v2_module_group_items
DO $$ BEGIN
  CREATE POLICY "anon_all_v2_module_group_items" ON public.v2_module_group_items FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- v2_checklist_status
DO $$ BEGIN
  CREATE POLICY "anon_all_v2_checklist_status" ON public.v2_checklist_status FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- v2_mood_moments
DO $$ BEGIN
  CREATE POLICY "anon_all_v2_mood_moments" ON public.v2_mood_moments FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- mood_dailies
DO $$ BEGIN
  CREATE POLICY "anon_all_mood_dailies" ON public.mood_dailies FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5) ÍNDICES
-- ============================================================
create index if not exists idx_v2_modules_key           on public.v2_modules(key);
create index if not exists idx_v2_mood_moments_day     on public.v2_mood_moments(day_key);
create index if not exists idx_v2_checklist_status_pk   on public.v2_checklist_status(item_id, period_key);
create index if not exists idx_mood_dailies_day         on public.mood_dailies(day_key);


-- ============================================================
-- ✅ PRONTO!
-- Seu Supabase agora suporta tanto o app antigo quanto o novo.
-- As tabelas antigas continuam funcionando para o app HTML original,
-- e as novas tabelas (v2_*) são usadas pelo app Next.js.
-- ============================================================