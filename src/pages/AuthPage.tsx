import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GraduationCap, Eye, EyeOff, ChevronDown, RefreshCw } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mathAverage, setMathAverage] = useState('');
  const [trackId, setTrackId] = useState('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksError, setTracksError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tracks dynamically from Supabase
  const fetchTracks = async () => {
    if (!supabase) return;
    setTracksError(false);
    try {
      const { data, error: fetchError } = await supabase.from('tracks').select('*').order('name');
      if (fetchError) throw fetchError;
      if (data && data.length > 0) {
        setTracks(data);
        setTrackId(data[0].id);
      } else {
        setTracksError(true);
      }
    } catch (_e) {
      setTracksError(true);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!trackId) {
          setError('الرجاء اختيار الشعبة الدراسية');
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([{
            user_id: data.user.id,
            full_name: fullName,
            grade_level: '3 ثانوي',
            math_average: parseFloat(mathAverage) || 10,
            track_id: trackId,
          }]);
          if (profileError) console.error('Error creating profile:', profileError);
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المصادقة');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3.5 border border-slate-200/80 rounded-2xl bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all hover:border-slate-300 text-slate-800 placeholder:text-slate-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-50 to-purple-100 p-4" dir="rtl">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-300/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-300/20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-100/30 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 form-enter">
        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-200/40 overflow-hidden border border-white/60">
          {/* Header */}
          <div className="bg-gradient-to-l from-indigo-600 via-indigo-700 to-purple-700 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
            {/* Decorative circles */}
            <div className="absolute top-4 left-4 w-20 h-20 rounded-full border border-white/10"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border border-white/10"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 text-white mb-4 backdrop-blur-sm shadow-lg shadow-indigo-900/20">
                <GraduationCap size={40} />
              </div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">الأستاذ</h1>
              <p className="text-indigo-200 text-sm">رفيقك الذكي للتحضير للبكالوريا 🎓</p>
            </div>
          </div>
          
          {/* Form */}
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6 text-center text-slate-800">
              {isLogin ? 'مرحباً بعودتك!' : 'انضم إلينا اليوم'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50/80 text-red-600 text-sm border border-red-100 flex items-center gap-2 backdrop-blur-sm">
                <span className="shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">الاسم الكامل</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClasses}
                      placeholder="محمد أمين..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">الشعبة الدراسية</label>
                    {tracksError ? (
                      <div className="w-full px-4 py-3.5 border border-amber-200 rounded-2xl bg-amber-50/80 text-amber-700 text-sm flex items-center justify-between">
                        <span>تعذر تحميل الشعب</span>
                        <button 
                          type="button" 
                          onClick={fetchTracks}
                          className="flex items-center gap-1.5 text-amber-800 font-bold hover:text-amber-900 transition-colors bg-amber-100 px-3 py-1 rounded-full text-xs"
                        >
                          <RefreshCw size={12} />
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : tracks.length > 0 ? (
                      <div className="relative">
                        <select
                          value={trackId}
                          onChange={(e) => setTrackId(e.target.value)}
                          className={`${inputClasses} appearance-none cursor-pointer pr-4 pl-10`}
                          required
                        >
                          {tracks.map((track) => (
                            <option key={track.id} value={track.id}>
                              {track.name} — {track.grade_level}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-full h-[52px] skeleton"></div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">معدل الرياضيات التقريبي (0-20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      required
                      value={mathAverage}
                      onChange={(e) => setMathAverage(e.target.value)}
                      className={inputClasses}
                      placeholder="12.5"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="student@example.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClasses} pl-12`}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-2xl transition-all focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg shadow-indigo-200/50 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'connectSpin 0.8s linear infinite' }}></span>
                    جاري المعالجة...
                  </span>
                ) : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
              >
                {isLogin ? 'سجل الآن' : 'سجل الدخول'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          الأستاذ — منصة تعليمية تفاعلية بالذكاء الاصطناعي
        </p>
      </div>
    </div>
  );
}
