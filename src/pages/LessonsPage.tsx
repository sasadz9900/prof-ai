import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlayCircle, CheckCircle, Circle, ArrowRight } from 'lucide-react';

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
        // Fetch Subject details
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();
        if (subjectData) setSubject(subjectData);

        // Fetch Lessons
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true });

        // Fetch Progress
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_id', session.user.id);

        if (lessonsData) {
          const merged = lessonsData.map(lesson => {
            const progress = progressData?.find(p => p.lesson_id === lesson.id);
            return {
              ...lesson,
              status: progress?.status || 'not_started'
            };
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

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="text-slate-500">جاري التحميل...</div></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8 mt-4 flex flex-col gap-4">
        <button 
          onClick={() => navigate('/lessons')}
          className="self-start flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight size={20} />
          العودة للمواد
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{subject?.name || 'الدروس'}</h1>
          <p className="text-slate-500">اختر درساً للبدء</p>
        </div>
      </header>

      <div className="space-y-4">
        {lessons.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            لا توجد دروس متاحة حالياً في هذه المادة.
          </div>
        ) : (
          lessons.map((lesson) => (
            <div 
              key={lesson.id}
              onClick={() => handleStartLesson(lesson.id, lesson.status)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-6 group"
            >
              <div className="shrink-0 flex items-center justify-center">
                {lesson.status === 'completed' ? (
                  <CheckCircle className="text-green-500" size={32} />
                ) : lesson.status === 'in_progress' ? (
                  <PlayCircle className="text-indigo-500" size={32} />
                ) : (
                  <Circle className="text-slate-300" size={32} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors mb-1">{lesson.title}</h3>
                <p className="text-sm text-slate-500">{lesson.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
