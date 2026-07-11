import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlayCircle, CheckCircle, ArrowRight, BookOpen, Clock } from 'lucide-react';

export default function LessonsPage({ session }: { session: any }) {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!supabase || !subjectId) return;
      try {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();
        if (subjectData) setSubject(subjectData);

        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true });

        const { data: progressData } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_id', session.user.id);

        if (lessonsData) {
          const merged = lessonsData.map(lesson => {
            const progress = progressData?.find(p => p.lesson_id === lesson.id);
            return { ...lesson, status: progress?.status || 'not_started' };
          });
          setLessons(merged);
        }
      } catch (e) {
        console.error('Failed to fetch lessons', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [subjectId, session]);

  const handleStartLesson = async (lessonId: string, currentStatus: string) => {
    if (!supabase) return;
    if (currentStatus === 'not_started') {
      await supabase.from('student_progress').insert({
        user_id: session.user.id,
        lesson_id: lessonId,
        status: 'in_progress',
        last_accessed: new Date().toISOString()
      });
    } else {
      await supabase.from('student_progress').update({
        last_accessed: new Date().toISOString()
      }).eq('user_id', session.user.id).eq('lesson_id', lessonId);
    }
    navigate(`/board/${subjectId}/${lessonId}`);
  };

  const completedCount = lessons.filter(l => l.status === 'completed').length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="skeleton h-5 w-24 mb-6"></div>
        <div className="skeleton h-9 w-56 mb-2"></div>
        <div className="skeleton h-5 w-72 mb-8"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8 mt-2 card-enter" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <button 
          onClick={() => navigate('/lessons')}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-4 text-sm font-medium group"
        >
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          العودة للمواد
        </button>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 mb-1">{subject?.name || 'الدروس'}</h1>
            <p className="text-slate-500">اختر درساً للبدء مع الأستاذ الذكي</p>
          </div>
          
          {lessons.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl px-5 py-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-2 font-medium">التقدم الكلي</div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-sm font-black text-indigo-700">{progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-3 relative">
        {/* Timeline line */}
        {lessons.length > 1 && (
          <div className="absolute right-[31px] top-6 bottom-6 w-0.5 bg-slate-100 hidden sm:block"></div>
        )}

        {lessons.length === 0 ? (
          <div className="text-center py-20 card-enter" style={{ '--delay': '100ms' } as React.CSSProperties}>
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto mb-6 border border-indigo-100 float-bounce">
              <BookOpen className="text-indigo-400" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد دروس متاحة</h3>
            <p className="text-slate-500">لم يتم إضافة دروس لهذه المادة بعد.</p>
          </div>
        ) : (
          lessons.map((lesson, i) => (
            <div 
              key={lesson.id}
              onClick={() => handleStartLesson(lesson.id, lesson.status)}
              className="card-enter bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all flex items-center gap-5 group active:scale-[0.99] relative"
              style={{ '--delay': `${(i + 1) * 80}ms` } as React.CSSProperties}
            >
              {/* Order number / status indicator */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 relative z-10 transition-transform group-hover:scale-110 ${
                lesson.status === 'completed' 
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-200/50'
                  : lesson.status === 'in_progress'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200/50'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {lesson.status === 'completed' ? (
                  <CheckCircle size={22} />
                ) : lesson.status === 'in_progress' ? (
                  <PlayCircle size={22} />
                ) : (
                  <span className="text-base">{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{lesson.title}</h3>
                {lesson.description && (
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{lesson.description}</p>
                )}
              </div>

              <div className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                lesson.status === 'completed'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : lesson.status === 'in_progress'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100'
              }`}>
                {lesson.status === 'completed' ? (
                  <>
                    <CheckCircle size={12} />
                    مكتمل
                  </>
                ) : lesson.status === 'in_progress' ? (
                  <>
                    <Clock size={12} />
                    قيد التعلم
                  </>
                ) : (
                  <>
                    <PlayCircle size={12} />
                    ابدأ
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
