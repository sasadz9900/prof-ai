import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, Atom, Calculator, FlaskConical, Globe, BookText, BrainCircuit } from 'lucide-react';

export default function SubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to map subject name to an icon
  const getSubjectIcon = (name: string) => {
    if (name.includes('الرياضيات')) return <Calculator size={32} />;
    if (name.includes('الفيزياء')) return <Atom size={32} />;
    if (name.includes('الكيمياء')) return <FlaskConical size={32} />;
    if (name.includes('علوم الطبيعة')) return <Globe size={32} />;
    if (name.includes('اللغة') || name.includes('عربية') || name.includes('فرنسية') || name.includes('إنجليزية')) return <BookText size={32} />;
    if (name.includes('فلسفة')) return <BrainCircuit size={32} />;
    return <Book size={32} />;
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!supabase) return;
      try {
        // Fetch track for 'علوم تجريبية'
        const { data: trackData } = await supabase
          .from('tracks')
          .select('id')
          .eq('name', 'علوم تجريبية')
          .single();

        if (trackData) {
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('track_id', trackData.id)
            .order('is_core', { ascending: false });
          
          if (subjectsData) {
            setSubjects(subjectsData);
          }
        }
      } catch (e) {
        console.error('Failed to fetch subjects', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="text-slate-500">جاري التحميل...</div></div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <header className="mb-10 mt-4">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">المواد الدراسية</h1>
        <p className="text-slate-500">شعبة: علوم تجريبية</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div 
            key={subject.id}
            onClick={() => navigate(`/lessons/${subject.id}`)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-indigo-200 transition-all text-center flex flex-col items-center group"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-inner ${subject.is_core ? 'bg-indigo-600' : 'bg-slate-400'}`}>
              {getSubjectIcon(subject.name)}
            </div>
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
            {subject.is_core && <span className="mt-2 text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">مادة أساسية</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
