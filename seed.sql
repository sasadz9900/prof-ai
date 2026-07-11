-- =====================================================
-- الأستاذ - Al-Ostadh: Database Setup & Seed Data
-- =====================================================
-- This script is IDEMPOTENT: safe to run multiple times.
-- It will NOT delete or modify any existing data.
-- =====================================================

-- ===== 1. CREATE TABLES (if not exist) =====

-- الشعب الدراسية
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  grade_level TEXT NOT NULL DEFAULT '3 ثانوي',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- المواد الدراسية
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_core BOOLEAN DEFAULT false,
  icon TEXT DEFAULT 'book',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(track_id, name)
);

-- الدروس
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, title)
);

-- تقدم الطالب
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_accessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ===== 2. ADD track_id TO profiles (if not exists) =====

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN track_id UUID REFERENCES tracks(id);
  END IF;
END $$;

-- ===== 3. ROW LEVEL SECURITY (RLS) =====

-- Enable RLS on all new tables
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Tracks: everyone can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracks' AND policyname = 'tracks_select_all') THEN
    CREATE POLICY tracks_select_all ON tracks FOR SELECT USING (true);
  END IF;
END $$;

-- Subjects: everyone can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'subjects_select_all') THEN
    CREATE POLICY subjects_select_all ON subjects FOR SELECT USING (true);
  END IF;
END $$;

-- Lessons: everyone can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'lessons_select_all') THEN
    CREATE POLICY lessons_select_all ON lessons FOR SELECT USING (true);
  END IF;
END $$;

-- Student Progress: users can read/write their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_progress' AND policyname = 'progress_select_own') THEN
    CREATE POLICY progress_select_own ON student_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_progress' AND policyname = 'progress_insert_own') THEN
    CREATE POLICY progress_insert_own ON student_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_progress' AND policyname = 'progress_update_own') THEN
    CREATE POLICY progress_update_own ON student_progress FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Profiles: allow users to read/update their own profile
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ===== 4. SEED DATA =====

-- الشعب (Tracks)
INSERT INTO tracks (name, grade_level) VALUES
  ('علوم تجريبية', '3 ثانوي'),
  ('رياضيات', '3 ثانوي'),
  ('تقني رياضي', '3 ثانوي'),
  ('آداب وفلسفة', '3 ثانوي'),
  ('لغات أجنبية', '3 ثانوي')
ON CONFLICT (name) DO NOTHING;

-- المواد: علوم تجريبية
INSERT INTO subjects (track_id, name, is_core, icon) VALUES
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'الرياضيات', true, 'calculator'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'الفيزياء', true, 'atom'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'العلوم الطبيعية', true, 'leaf'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'اللغة العربية', false, 'book-text'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'اللغة الفرنسية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'اللغة الإنجليزية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'الفلسفة', false, 'brain'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'التاريخ والجغرافيا', false, 'globe'),
  ((SELECT id FROM tracks WHERE name = 'علوم تجريبية'), 'العلوم الإسلامية', false, 'moon')
ON CONFLICT (track_id, name) DO NOTHING;

-- المواد: رياضيات
INSERT INTO subjects (track_id, name, is_core, icon) VALUES
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'الرياضيات', true, 'calculator'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'الفيزياء', true, 'atom'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'العلوم الطبيعية', false, 'leaf'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'اللغة العربية', false, 'book-text'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'اللغة الفرنسية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'اللغة الإنجليزية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'رياضيات'), 'الفلسفة', false, 'brain')
ON CONFLICT (track_id, name) DO NOTHING;

-- المواد: تقني رياضي
INSERT INTO subjects (track_id, name, is_core, icon) VALUES
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'الرياضيات', true, 'calculator'),
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'الفيزياء', true, 'atom'),
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'الهندسة الميكانيكية', true, 'cog'),
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'اللغة العربية', false, 'book-text'),
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'اللغة الفرنسية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'تقني رياضي'), 'اللغة الإنجليزية', false, 'languages')
ON CONFLICT (track_id, name) DO NOTHING;

-- المواد: آداب وفلسفة
INSERT INTO subjects (track_id, name, is_core, icon) VALUES
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'الفلسفة', true, 'brain'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'اللغة العربية', true, 'book-text'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'التاريخ والجغرافيا', true, 'globe'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'اللغة الفرنسية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'اللغة الإنجليزية', false, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'العلوم الإسلامية', false, 'moon'),
  ((SELECT id FROM tracks WHERE name = 'آداب وفلسفة'), 'الرياضيات', false, 'calculator')
ON CONFLICT (track_id, name) DO NOTHING;

-- المواد: لغات أجنبية
INSERT INTO subjects (track_id, name, is_core, icon) VALUES
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'اللغة الفرنسية', true, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'اللغة الإنجليزية', true, 'languages'),
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'اللغة العربية', true, 'book-text'),
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'الفلسفة', false, 'brain'),
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'التاريخ والجغرافيا', false, 'globe'),
  ((SELECT id FROM tracks WHERE name = 'لغات أجنبية'), 'الرياضيات', false, 'calculator')
ON CONFLICT (track_id, name) DO NOTHING;

-- دروس تجريبية: الرياضيات (علوم تجريبية)
INSERT INTO lessons (subject_id, title, description, order_index) VALUES
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'الرياضيات'),
    'الدوال العددية - النهايات',
    'دراسة نهايات الدوال العددية وخصائصها',
    1
  ),
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'الرياضيات'),
    'الاشتقاقية والدراسة',
    'الاشتقاق وتطبيقاته في دراسة الدوال',
    2
  ),
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'الرياضيات'),
    'المتتاليات العددية',
    'المتتاليات الحسابية والهندسية وتطبيقاتها',
    3
  )
ON CONFLICT (subject_id, title) DO NOTHING;

-- دروس تجريبية: الفيزياء (علوم تجريبية)
INSERT INTO lessons (subject_id, title, description, order_index) VALUES
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'الفيزياء'),
    'المتابعة الزمنية لتحول كيميائي',
    'قياس سرعة التفاعل ومتابعة تطوره',
    1
  ),
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'الفيزياء'),
    'الظواهر الكهربائية',
    'الدارات الكهربائية RC و RL',
    2
  )
ON CONFLICT (subject_id, title) DO NOTHING;

-- دروس تجريبية: العلوم الطبيعية (علوم تجريبية)
INSERT INTO lessons (subject_id, title, description, order_index) VALUES
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'العلوم الطبيعية'),
    'التركيب الضوئي',
    'آلية التركيب الضوئي ومراحله',
    1
  ),
  (
    (SELECT s.id FROM subjects s JOIN tracks t ON s.track_id = t.id WHERE t.name = 'علوم تجريبية' AND s.name = 'العلوم الطبيعية'),
    'دور البروتينات في الدفاع عن الذات',
    'المناعة والاستجابة المناعية',
    2
  )
ON CONFLICT (subject_id, title) DO NOTHING;

-- ===== 5. AUTH TRIGGER (Auto-create profile) =====

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== DONE =====
-- Tables created, RLS policies set, seed data inserted.
