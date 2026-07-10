import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { GraduationCap } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mathAverage, setMathAverage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              user_id: data.user.id,
              full_name: fullName,
              grade_level: '3 ثانوي علوم تجريبية',
              math_average: parseFloat(mathAverage) || 10,
            }
          ]);
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Optionally handle profile creation error
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white mb-4">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">الأستاذ الافتراضي</h1>
          <p className="text-indigo-100 text-sm">رفيقك الذكي للتحضير للبكالوريا</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="محمد أمين..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المستوى الدراسي</label>
                  <input
                    type="text"
                    disabled
                    value="3 ثانوي علوم تجريبية"
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">النسخة التجريبية تدعم هذا المستوى فقط حالياً.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">معدل الرياضيات التقريبي (0-20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    required
                    value={mathAverage}
                    onChange={(e) => setMathAverage(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="12.5"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="student@example.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'جاري المعالجة...' : isLogin ? 'دخول' : 'تسجيل'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {isLogin ? 'سجل الآن' : 'سجل الدخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
