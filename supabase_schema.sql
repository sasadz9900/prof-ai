-- أنشئ هذا الجدول في Supabase SQL Editor
CREATE TABLE IF NOT EXISTS curated_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_tag text NOT NULL,
  youtube_video_id text NOT NULL,
  start_seconds integer,
  end_seconds integer,
  title text,
  verified boolean DEFAULT true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إدراج بعض الفيديوهات التجريبية (أمثلة)
INSERT INTO curated_videos (concept_tag, youtube_video_id, start_seconds, end_seconds, title, verified)
VALUES 
('الاحتمالات_الشرطية', 'dQw4w9WgXcQ', 0, 60, 'مقدمة في الاحتمالات الشرطية', true),
('النهايات', 'dQw4w9WgXcQ', 0, 60, 'حساب النهايات الأساسية', true),
('الاشتقاق', 'dQw4w9WgXcQ', 0, 60, 'قواعد الاشتقاق', true);

-- إذا كان الجدول موجوداً مسبقاً، نفذ هذا السطر فقط:
-- ALTER TABLE curated_videos ADD COLUMN verified boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  subject text,
  lesson_state jsonb DEFAULT '{"topic": null, "phase": "not_started", "current_step_index": 0, "covered_points": []}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'model')),
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
