import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Library, Moon, LineChart, PlayCircle, Sparkles, ArrowLeft } from 'lucide-react';

export default function HomePage({ session }: { session: any }) {
  const navigate = useNavigate();
  const [inProgressLesson, setInProgressLesson] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [trackName, setTrackName] = useState<string>('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ صباح الخير';
    if (hour < 17) return '🌤️ مساء الخير';
    return '🌙 مساء النور';
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!supabase) return;
      
      // Fetch profile with track name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, track_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile) {
        setUserName(profile.full_name || session.user.email?.split('@')[0] || 'طالب');
        if (profile.track_id) {
          const { data: track } = await supabase
            .from('tracks')
            .select('name')
            .eq('id', profile.track_id)
            .single();
          if (track) setTrackName(track.name);
        }
      } else {
        setUserName(session.user.email?.split('@')[0] || 'طالب');
      }
    };

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
        
        if (data) setInProgressLesson(data);
      } catch (_e) { /* No progress yet */ }
    };

    fetchUserData();
    fetchProgress();
  }, [session]);

  const cards = [
    { title: 'الدروس', subtitle: 'ابدأ التعلم الآن مع الأستاذ الذكي', icon: BookOpen, path: '/lessons', gradient: 'from-indigo-500 to-purple-600', shadowColor: 'shadow-indigo-200/60', disabled: false },
    { title: 'المكتبة', subtitle: 'ملخصات وتمارين محلولة', icon: Library, path: '#', gradient: 'from-teal-500 to-emerald-600', shadowColor: 'shadow-teal-200/60', disabled: true },
    { title: 'القسم الروحي', subtitle: 'أدعية وتحفيز وتنظيم الوقت', icon: Moon, path: '#', gradient: 'from-amber-500 to-orange-600', shadowColor: 'shadow-amber-200/60', disabled: true },
    { title: 'متابعتي', subtitle: 'تقدمك ونتائجك وإحصائياتك', icon: LineChart, path: '#', gradient: 'from-rose-500 to-pink-600', shadowColor: 'shadow-rose-200/60', disabled: true },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Welcome Banner */}
      <header className="mb-10 mt-2 card-enter" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <div className="bg-gradient-to-l from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl shadow-indigo-200/40">
          {/* Decorative */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5"></div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="flex items-center gap-2 text-indigo-200 text-sm mb-3 font-medium">
              <Sparkles size={16} />
              {getGreeting()}
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">{userName} 👋</h1>
            {trackName && (
              <p className="text-indigo-200 flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">{trackName}</span>
                <span>ماذا تريد أن تتعلم اليوم؟</span>
              </p>
            )}
            {!trackName && <p className="text-indigo-200">ماذا تريد أن تتعلم اليوم؟</p>}
          </div>
        </div>
      </header>

      {/* Continue Learning */}
      {inProgressLesson && inProgressLesson.lessons && (
        <section className="mb-10 card-enter" style={{ '--delay': '100ms' } as React.CSSProperties}>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PlayCircle className="text-indigo-600" size={22} />
            أكمل من حيث توقفت
          </h2>
          <div 
            onClick={() => navigate(`/board/${inProgressLesson.lessons.subject_id}/${inProgressLesson.lesson_id}`)}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-indigo-100 shadow-md shadow-indigo-100/50 cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all flex items-center justify-between group active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-semibold text-indigo-600 mb-1">{inProgressLesson.lessons.subjects?.name}</div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{inProgressLesson.lessons.title}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0 shadow-sm">
              <ArrowLeft size={24} />
            </div>
          </div>
        </section>
      )}

      {/* Main Sections */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-5">الأقسام الرئيسية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <div 
              key={card.title}
              onClick={() => !card.disabled && navigate(card.path)}
              className={`card-enter p-6 rounded-2xl border flex items-center gap-5 transition-all ${
                card.disabled 
                  ? 'bg-slate-50/80 border-slate-100 cursor-not-allowed' 
                  : `bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 active:scale-[0.98]`
              }`}
              style={{ '--delay': `${(i + 2) * 80}ms` } as React.CSSProperties}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${card.shadowColor} bg-gradient-to-br ${card.gradient} shrink-0 ${card.disabled ? 'opacity-50' : ''}`}>
                <card.icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold ${card.disabled ? 'text-slate-400' : 'text-slate-800'}`}>{card.title}</h3>
                <p className={`text-sm mt-0.5 ${card.disabled ? 'text-slate-300' : 'text-slate-500'}`}>{card.subtitle}</p>
                {card.disabled && (
                  <span className="inline-block mt-2 text-[10px] font-bold bg-slate-200/80 text-slate-500 px-2.5 py-0.5 rounded-full">قريباً إن شاء الله</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
