import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlayCircle, CheckCircle, Circle, ArrowRight, BookOpen } from 'lucide-react';

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
      <div className="p-8 flex justify-center items-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" style={{ animation: 'connectSpin 0.8s linear infinite' }}></div>
          <span className="text-slate-500">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8 mt-2">
        <button 
          onClick={() => navigate('/lessons')}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-4 text-sm font-medium"
        >
          <ArrowRight size={18} />
          العودة للمواد
        </button>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 mb-1">{subject?.name || 'الدروس'}</h1>
            <p className="text-slate-500">اختر درساً للبدء مع الأستاذ الذكي</p>
          </div>
          
          {lessons.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-1.5">التقدم الكلي</div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="text-sm font-bold text-indigo-700">{progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-slate-400" size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد دروس متاحة</h3>
            <p className="text-slate-500">لم يتم إضافة دروس لهذه المادة بعد.</p>
          </div>
        ) : (
          lessons.map((lesson, i) => (
            <div 
              key={lesson.id}
              onClick={() => handleStartLesson(lesson.id, lesson.status)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all flex items-center gap-5 group active:scale-[0.99]"
            >
              {/* Order number */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                lesson.status === 'completed' 
                  ? 'bg-green-100 text-green-700'
                  : lesson.status === 'in_progress'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {lesson.status === 'completed' ? (
                  <CheckCircle size={22} />
                ) : lesson.status === 'in_progress' ? (
                  <PlayCircle size={22} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{lesson.title}</h3>
                {lesson.description && (
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{lesson.description}</p>
                )}
              </div>

              <div className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${
                lesson.status === 'completed'
                  ? 'bg-green-50 text-green-700'
                  : lesson.status === 'in_progress'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-slate-50 text-slate-400'
              }`}>
                {lesson.status === 'completed' ? 'مكتمل' : lesson.status === 'in_progress' ? 'قيد التعلم' : 'ابدأ'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
