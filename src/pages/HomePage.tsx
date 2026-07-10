import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Library, Moon, LineChart, PlayCircle } from 'lucide-react';

export default function HomePage({ session }: { session: any }) {
  const navigate = useNavigate();
  const [inProgressLesson, setInProgressLesson] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    setUserName(session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'طالب');

    const fetchProgress = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('student_progress')
          .select(`
            lesson_id,
            status,
            lessons ( id, title, subject_id, subjects ( name ) )
          `)
          .eq('user_id', session.user.id)
          .eq('status', 'in_progress')
          .order('last_accessed', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          setInProgressLesson(data);
        }
      } catch (e) {
        console.error('Failed to fetch progress', e);
      }
    };
    fetchProgress();
  }, [session]);

  const cards = [
    { title: 'الدروس', icon: BookOpen, path: '/lessons', color: 'bg-indigo-500', disabled: false },
    { title: 'المكتبة', icon: Library, path: '#', color: 'bg-teal-500', disabled: true },
    { title: 'القسم الروحي', icon: Moon, path: '#', color: 'bg-amber-500', disabled: true },
    { title: 'متابعتي', icon: LineChart, path: '#', color: 'bg-rose-500', disabled: true },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <header className="mb-10 mt-4">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">مرحباً بك، {userName} 👋</h1>
        <p className="text-slate-500">ماذا تريد أن تتعلم اليوم؟</p>
      </header>

      {inProgressLesson && inProgressLesson.lessons && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PlayCircle className="text-indigo-600" size={24} />
            أكمل من حيث توقفت
          </h2>
          <div 
            onClick={() => navigate(`/board/${inProgressLesson.lessons.subject_id}/${inProgressLesson.lesson_id}`)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-sm font-semibold text-indigo-600 mb-1">{inProgressLesson.lessons.subjects?.name}</div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{inProgressLesson.lessons.title}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <PlayCircle size={32} />
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">الأقسام الرئيسية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div 
              key={card.title}
              onClick={() => !card.disabled && navigate(card.path)}
              className={`p-6 rounded-2xl border flex items-center gap-6 transition-all ${
                card.disabled 
                  ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-indigo-200'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-inner ${card.color}`}>
                <card.icon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{card.title}</h3>
                {card.disabled && <span className="inline-block mt-2 text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded">قريباً</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
