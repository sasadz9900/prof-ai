/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import MainPage from './pages/MainPage';
import HomePage from './pages/HomePage';
import SubjectsPage from './pages/SubjectsPage';
import LessonsPage from './pages/LessonsPage';
import MainLayout from './components/MainLayout';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full" style={{ animation: 'connectSpin 0.8s linear infinite' }}></div>
          <span className="text-slate-500 font-medium">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 text-center" dir="rtl">
        <div className="max-w-md rounded-2xl border border-yellow-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="mb-3 font-bold text-yellow-800 text-xl">تكوين قاعدة البيانات مطلوب</h2>
          <p className="text-yellow-700 mb-4 leading-relaxed">
            الرجاء إضافة مفاتيح <code className="bg-yellow-100 px-1 rounded">VITE_SUPABASE_URL</code> و <code className="bg-yellow-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> 
            في إعدادات التطبيق لتمكين تسجيل الدخول وقاعدة البيانات.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/home" />} />
        
        <Route element={session ? <MainLayout session={session} /> : <Navigate to="/auth" />}>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<HomePage session={session} />} />
          <Route path="/lessons" element={<SubjectsPage session={session} />} />
          <Route path="/lessons/:subjectId" element={<LessonsPage session={session} />} />
          <Route path="/board/:subjectId/:lessonId" element={<MainPage session={session} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
