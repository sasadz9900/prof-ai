-- 1. الشعب الدراسية
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade_level text not null default '3 ثانوي'
);

-- 2. المواد لكل شعبة
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id),
  name text not null,
  icon text,
  is_core boolean default false,
  teacher_voice text default 'Charon',
  teacher_prompt_addition text default ''
);

-- 3. الدروس داخل كل مادة
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  title text not null,
  order_index int not null,
  description text
);

-- 4. تقدم التلميذ في كل درس
create table if not exists student_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  lesson_id uuid references lessons(id),
  status text default 'not_started',
  last_accessed timestamptz,
  unique(user_id, lesson_id)
);

-- =========================================
-- تعبئة البيانات (الشعب)
-- =========================================
insert into tracks (name, grade_level) values
('علوم تجريبية', '2-3 ثانوي'),
('رياضيات', '2-3 ثانوي'),
('تقني رياضي', '2-3 ثانوي'),
('تسيير واقتصاد', '2-3 ثانوي'),
('آداب وفلسفة', '2-3 ثانوي'),
('لغات أجنبية', '2-3 ثانوي');

-- =========================================
-- تعبئة البيانات (المواد)
-- =========================================
-- 1. علوم تجريبية
insert into subjects (track_id, name, is_core, teacher_voice, teacher_prompt_addition) values
((select id from tracks where name='علوم تجريبية'), 'علوم الطبيعة والحياة', true, 'Aoede', 'أنت أستاذة علوم الطبيعة والحياة. اشرح بأسلوب وصفي غني بالتفاصيل، مع التركيز على الرسوم التوضيحية (draw_shape) للأعضاء والعمليات البيولوجية. اربط المفاهيم بجسم الإنسان أو الطبيعة المحيطة بالتلميذ.'),
((select id from tracks where name='علوم تجريبية'), 'الفيزياء', true, 'Fenrir', 'أنت أستاذ فيزياء. اربط كل مفهوم نظري بمثال واقعي ملموس من حياة التلميذ اليومية قبل الصيغة الرياضية. أظهر حماساً حقيقياً عند شرح الظواهر الطبيعية. استعمل draw_vector لتوضيح القوى والحركة.'),
((select id from tracks where name='علوم تجريبية'), 'الكيمياء', true, 'Puck', 'أنت أستاذ كيمياء. اشرح بأسلوب فضولي ومشوّق، كأنك تكشف "أسرار" المادة. اربط كل تفاعل كيميائي بأمثلة من الحياة اليومية (الطبخ، الصدأ، التنفس).'),
((select id from tracks where name='علوم تجريبية'), 'الرياضيات', true, 'Charon', 'أنت أستاذ رياضيات. ركّز على الدقة المنطقية والخطوات المتسلسلة. استعمل plot_function وdraw_shape بكثرة لتوضيح المفاهيم بصرياً. لا تنتقل لخطوة تالية قبل التأكد أن التلميذ فهم الخطوة الحالية (استعمل أسلوب Socratic: وجّهه بأسئلة بدل إعطاء الحل مباشرة).'),
((select id from tracks where name='علوم تجريبية'), 'اللغة العربية وآدابها', false, 'Kore', 'أنت أستاذة لغة عربية وآدابها. اهتمي بجمال اللغة والتعبير. عند شرح نص أدبي، حلّلي الأسلوب والمعنى دون نسخ نصوص طويلة حرفياً - لخّصي وناقشي الأفكار بأسلوبك. شجّعي التلميذ على التعبير برأيه الخاص.'),
((select id from tracks where name='علوم تجريبية'), 'الفلسفة', false, 'Charon', 'أنت أستاذ فلسفة. اعتمد أسلوب الحوار السقراطي بالكامل - اطرح أسئلة تحفّز التفكير النقدي بدل إعطاء إجابات جاهزة. عند عرض قضية فلسفية جدلية، اعرض دائماً أكثر من وجهة نظر بإنصاف قبل أن تسأل التلميذ عن رأيه الخاص.'),
((select id from tracks where name='علوم تجريبية'), 'العلوم الإسلامية', false, 'Charon', ''),
((select id from tracks where name='علوم تجريبية'), 'التاريخ والجغرافيا', false, 'Puck', 'أنت أستاذ تاريخ وجغرافيا. اروِ الأحداث التاريخية بأسلوب قصصي مشوّق يخلق تسلسلاً زمنياً واضحاً على السبورة. استعمل الرسم لتوضيح الخرائط والحدود الجغرافية عند الحاجة.'),
((select id from tracks where name='علوم تجريبية'), 'اللغة الفرنسية', false, 'Kore', 'أنت أستاذ لغة فرنسية. شجّع التلميذ على التحدث والتفاعل بالفرنسية قدر الإمكان، مع الصبر الكامل على الأخطاء. صحّح بلطف مع شرح القاعدة، لا تكتفِ بالتصحيح دون توضيح.'),
((select id from tracks where name='علوم تجريبية'), 'اللغة الإنجليزية', false, 'Aoede', 'أنت أستاذة لغة إنجليزية. شجعي التلميذ على المحادثة الفعلية بالإنجليزية، صححي الأخطاء بلطف مع شرح القاعدة النحوية المرتبطة بها.');

-- 2. رياضيات
insert into subjects (track_id, name, is_core) values
((select id from tracks where name='رياضيات'), 'الرياضيات', true),
((select id from tracks where name='رياضيات'), 'الفيزياء', true),
((select id from tracks where name='رياضيات'), 'الكيمياء', true),
((select id from tracks where name='رياضيات'), 'علوم الطبيعة والحياة', false),
((select id from tracks where name='رياضيات'), 'اللغة العربية وآدابها', false),
((select id from tracks where name='رياضيات'), 'التاريخ والجغرافيا', false),
((select id from tracks where name='رياضيات'), 'الفلسفة', false),
((select id from tracks where name='رياضيات'), 'العلوم الإسلامية', false),
((select id from tracks where name='رياضيات'), 'اللغة الفرنسية', false),
((select id from tracks where name='رياضيات'), 'اللغة الإنجليزية', false);

-- تحديث أصوات ومعلومات باقي الشعب (توضيحي)
update subjects set teacher_voice = 'Charon', teacher_prompt_addition = 'أنت أستاذ رياضيات...' where name = 'الرياضيات';
update subjects set teacher_voice = 'Fenrir', teacher_prompt_addition = 'أنت أستاذ فيزياء...' where name = 'الفيزياء';
update subjects set teacher_voice = 'Puck', teacher_prompt_addition = 'أنت أستاذ كيمياء...' where name = 'الكيمياء';

-- =========================================
-- إضافة بعض الدروس التجريبية في الرياضيات (شعبة علوم تجريبية)
-- =========================================
insert into lessons (subject_id, title, order_index, description) values
(
  (select id from subjects where name='الرياضيات' and track_id=(select id from tracks where name='علوم تجريبية') limit 1), 
  'النهايات والاستمرارية', 1, 'دراسة النهايات للحالات المعقدة والاستمرارية'
),
(
  (select id from subjects where name='الرياضيات' and track_id=(select id from tracks where name='علوم تجريبية') limit 1), 
  'المتتاليات العددية', 2, 'دراسة المتتاليات الحسابية والهندسية والبرهان بالتراجع'
),
(
  (select id from subjects where name='الرياضيات' and track_id=(select id from tracks where name='علوم تجريبية') limit 1), 
  'الاحتمالات', 3, 'الاحتمالات الشرطية والمتغير العشوائي'
);
