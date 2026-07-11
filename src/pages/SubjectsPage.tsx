import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, Atom, Calculator, FlaskConical, Globe, BookText, BrainCircuit, Leaf, Languages, Moon as MoonIcon, Cog, BookOpen } from 'lucide-react';

const iconMap: Record<string, any> = {
  calculator: Calculator,
  atom: Atom,
  leaf: Leaf,
  'book-text': BookText,
  languages: Languages,
  brain: BrainCircuit,
  globe: Globe,
  moon: MoonIcon,
  flask: FlaskConical,
  cog: Cog,
  book: Book,
};

const colorPalette = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-teal-500 to-emerald-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-red-500 to-rose-600',
];

export default function SubjectsPage({ session }: { session: any }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [trackName, setTrackName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!supabase) return;
      try {
        // Get user's track_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('track_id')
          .eq('user_id', session.user.id)
          .single();

        if (!profile?.track_id) {
          setLoading(false);
          return;
        }

        // Get track name
        const { data: trackData } = await supabase
          .from('tracks')
          .select('name')
          .eq('id', profile.track_id)
          .single();
        
        if (trackData) setTrackName(trackData.name);

        // Fetch subjects for this track
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('track_id', profile.track_id)
          .order('is_core', { ascending: false });
        
        if (subjectsData) setSubjects(subjectsData);
      } catch (e) {
        console.error('Failed to fetch subjects', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [session]);

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || BookOpen;
    return <IconComponent size={28} />;
  };

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
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-black text-slate-800 mb-2">المواد الدراسية</h1>
        {trackName && (
          <p className="text-slate-500 flex items-center gap-2">
            شعبة:
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{trackName}</span>
          </p>
        )}
      </header>

      {subjects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-slate-400" size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد مواد بعد</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            لم يتم تحميل المواد الدراسية لشعبتك حتى الآن. تأكد من أن قاعدة البيانات تحتوي على بيانات الشعب والمواد.
          </p>
        </div>
      ) : (
        <>
          {/* Core subjects */}
          {subjects.some(s => s.is_core) && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">المواد الأساسية</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {subjects.filter(s => s.is_core).map((subject, i) => (
                  <div 
                    key={subject.id}
                    onClick={() => navigate(`/lessons/${subject.id}`)}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all text-center flex flex-col items-center group active:scale-[0.98]"
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-gradient-to-br ${colorPalette[i % colorPalette.length]}`}>
                      {getIcon(subject.icon)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
                    <span className="mt-2 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">مادة أساسية</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Non-core subjects */}
          {subjects.some(s => !s.is_core) && (
            <section>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">مواد أخرى</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {subjects.filter(s => !s.is_core).map((subject, i) => (
                  <div 
                    key={subject.id}
                    onClick={() => navigate(`/lessons/${subject.id}`)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 transition-all flex items-center gap-4 group active:scale-[0.98]"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow bg-gradient-to-br ${colorPalette[(i + 3) % colorPalette.length]} shrink-0`}>
                      {getIcon(subject.icon)}
                    </div>
                    <h3 className="text-base font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
