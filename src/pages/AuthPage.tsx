import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mathAverage, setMathAverage] = useState('');
  const [trackId, setTrackId] = useState('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tracks dynamically from Supabase
  useEffect(() => {
    const fetchTracks = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('tracks').select('*').order('name');
      if (data && data.length > 0) {
        setTracks(data);
        setTrackId(data[0].id);
      }
    };
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-4" dir="rtl">
      {/* Decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-200/30 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/50 overflow-hidden border border-white/50">
          {/* Header */}
          <div className="bg-gradient-to-l from-indigo-600 via-indigo-700 to-purple-700 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 text-white mb-4 backdrop-blur-sm">
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
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">الاسم الكامل</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
                      placeholder="محمد أمين..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">الشعبة الدراسية</label>
                    {tracks.length > 0 ? (
                      <select
                        value={trackId}
                        onChange={(e) => setTrackId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 appearance-none cursor-pointer"
                        required
                      >
                        {tracks.map((track) => (
                          <option key={track.id} value={track.id}>
                            {track.name} — {track.grade_level}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-sm">
                        جاري تحميل الشعب...
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">معدل الرياضيات التقريبي (0-20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      required
                      value={mathAverage}
                      onChange={(e) => setMathAverage(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
                      placeholder="12.5"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
                  placeholder="student@example.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 pl-12"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition-all focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg shadow-indigo-200/50 active:scale-[0.98]"
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
      </div>
    </div>
  );
}
