import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, Atom, Calculator, FlaskConical, Globe, BookText, BrainCircuit, Leaf, Languages, Moon as MoonIcon, Cog, BookOpen, ChevronDown, CheckCircle2 } from 'lucide-react';

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
  { bg: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-200/50', light: 'bg-indigo-50' },
  { bg: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-200/50', light: 'bg-blue-50' },
  { bg: 'from-teal-500 to-emerald-600', shadow: 'shadow-teal-200/50', light: 'bg-teal-50' },
  { bg: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50', light: 'bg-amber-50' },
  { bg: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200/50', light: 'bg-rose-50' },
  { bg: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-violet-200/50', light: 'bg-violet-50' },
  { bg: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-200/50', light: 'bg-sky-50' },
  { bg: 'from-lime-500 to-green-600', shadow: 'shadow-lime-200/50', light: 'bg-lime-50' },
  { bg: 'from-red-500 to-rose-600', shadow: 'shadow-red-200/50', light: 'bg-red-50' },
];

export default function SubjectsPage({ session }: { session: any }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [trackName, setTrackName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Track selection states
  const [showTrackSelection, setShowTrackSelection] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [savingTrack, setSavingTrack] = useState(false);
  const [tracksError, setTracksError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      setShowTrackSelection(false);
      try {
        // 1. Get user's track_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('track_id')
          .eq('user_id', session.user.id)
          .single();

        // 2. If no track_id, show selection screen
        if (!profile?.track_id) {
          const { data: tracksData, error: tracksErr } = await supabase.from('tracks').select('*').order('name');
          if (tracksErr || !tracksData || tracksData.length === 0) {
            setTracksError(true);
          } else {
            setAvailableTracks(tracksData);
            setSelectedTrackId(tracksData[0].id);
          }
          setShowTrackSelection(true);
          setLoading(false);
          return;
        }

        // 3. Get track name
        const { data: trackData } = await supabase
          .from('tracks')
          .select('name')
          .eq('id', profile.track_id)
          .single();
        
        if (trackData) setTrackName(trackData.name);

        // 4. Fetch subjects for this track
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('track_id', profile.track_id)
          .order('is_core', { ascending: false });
        
        if (subjectsData) {
          // Fetch lesson counts for each subject
          const enriched = await Promise.all(subjectsData.map(async (subject) => {
            const { count } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('subject_id', subject.id);
            return { ...subject, lessonCount: count || 0 };
          }));
          setSubjects(enriched);
        }
      } catch (e) {
        console.error('Failed to fetch data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session, refreshKey]);

  const handleSaveTrack = async () => {
    if (!supabase || !selectedTrackId) return;
    setSavingTrack(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: session.user.id, track_id: selectedTrackId },
          { onConflict: 'user_id' }
        );
      
      if (!error) {
        // Successfully saved, now refresh the subjects
        setRefreshKey(prev => prev + 1);
      } else {
        console.error('Supabase error:', error);
      }
    } catch (e) {
      console.error('Error saving track:', e);
    } finally {
      setSavingTrack(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || BookOpen;
    return <IconComponent size={28} />;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="skeleton h-8 w-48 mb-3"></div>
        <div className="skeleton h-5 w-32 mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }}></div>
          ))}
        </div>
      </div>
    );
  }

  // --- Track Selection Screen ---
  if (showTrackSelection) {
    return (
      <div className="p-6 md:p-8 max-w-xl mx-auto w-full h-[calc(100vh-100px)] flex flex-col justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-200/40 p-8 border border-white/60 text-center card-enter">
          <div className="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-6">
            <BookOpen size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">مرحباً بك!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            قبل أن نبدأ، يرجى اختيار شعبتك الدراسية حتى نتمكن من تخصيص المواد والدروس المناسبة لك.
          </p>

          {tracksError ? (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 mb-6 text-sm">
              لم نتمكن من تحميل الشعب. يرجى التأكد من تشغيل <code>seed.sql</code> في قاعدة البيانات.
            </div>
          ) : (
            <div className="space-y-6 text-right">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الشعبة الدراسية</label>
                <div className="relative">
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200/80 rounded-2xl bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all hover:border-slate-300 text-slate-800 appearance-none cursor-pointer pr-4 pl-10"
                    disabled={savingTrack}
                  >
                    {availableTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.name} — {track.grade_level}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleSaveTrack}
                disabled={savingTrack || !selectedTrackId}
                className="w-full bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-200/50 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingTrack ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'connectSpin 0.8s linear infinite' }}></span>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    حفظ ومتابعة
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Normal Subjects Screen ---
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 mt-2 card-enter" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <h1 className="text-3xl font-black text-slate-800 mb-2">المواد الدراسية</h1>
        {trackName && (
          <p className="text-slate-500 flex items-center gap-2">
            شعبة:
            <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1 rounded-full text-sm font-bold border border-indigo-100">{trackName}</span>
          </p>
        )}
      </header>

      {subjects.length === 0 ? (
        <div className="text-center py-20 card-enter" style={{ '--delay': '100ms' } as React.CSSProperties}>
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto mb-6 border border-indigo-100 float-bounce">
            <BookOpen className="text-indigo-400" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد مواد بعد</h3>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
            لم يتم تحميل المواد الدراسية لشعبتك حتى الآن. تأكد من أن قاعدة البيانات تحتوي على بيانات الشعب والمواد.
          </p>
        </div>
      ) : (
        <>
          {/* Core subjects */}
          {subjects.some(s => s.is_core) && (
            <section className="mb-10">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">المواد الأساسية</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {subjects.filter(s => s.is_core).map((subject, i) => {
                  const color = colorPalette[i % colorPalette.length];
                  return (
                    <div 
                      key={subject.id}
                      onClick={() => navigate(`/lessons/${subject.id}`)}
                      className="card-enter bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1.5 hover:border-indigo-200 transition-all text-center flex flex-col items-center group active:scale-[0.98]"
                      style={{ '--delay': `${(i + 1) * 80}ms` } as React.CSSProperties}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg ${color.shadow} bg-gradient-to-br ${color.bg} group-hover:scale-110 transition-transform`}>
                        {getIcon(subject.icon)}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">مادة أساسية</span>
                        {subject.lessonCount > 0 && (
                          <span className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded-full">{subject.lessonCount} دروس</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Non-core subjects */}
          {subjects.some(s => !s.is_core) && (
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">مواد أخرى</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.filter(s => !s.is_core).map((subject, i) => {
                  const color = colorPalette[(i + 3) % colorPalette.length];
                  return (
                    <div 
                      key={subject.id}
                      onClick={() => navigate(`/lessons/${subject.id}`)}
                      className="card-enter bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 transition-all flex items-center gap-4 group active:scale-[0.98]"
                      style={{ '--delay': `${(i + subjects.filter(s => s.is_core).length + 1) * 80}ms` } as React.CSSProperties}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow ${color.shadow} bg-gradient-to-br ${color.bg} shrink-0 group-hover:scale-110 transition-transform`}>
                        {getIcon(subject.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
                        {subject.lessonCount > 0 && (
                          <span className="text-xs text-slate-400">{subject.lessonCount} دروس</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
