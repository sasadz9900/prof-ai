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
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500">
        جاري التحميل...
      </div>
    );
  }

  // If Supabase is not configured, show a helpful message
  if (!supabase) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6 text-center" dir="rtl">
        <div className="max-w-md rounded-xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <h2 className="mb-2 font-bold text-yellow-800 text-xl">تكوين قاعدة البيانات مطلوب</h2>
          <p className="text-yellow-700 mb-4">
            الرجاء إضافة مفاتيح <code>VITE_SUPABASE_URL</code> و <code>VITE_SUPABASE_ANON_KEY</code> 
            في إعدادات التطبيق لتمكين تسجيل الدخول وقاعدة البيانات.
          </p>
          <div className="text-sm text-yellow-600 bg-yellow-100 p-3 rounded text-right">
            يمكنك العثور على هذه الإعدادات في لوحة تحكم Supabase الخاصة بك.
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/home" />} />
        
        <Route element={session ? <MainLayout /> : <Navigate to="/auth" />}>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<HomePage session={session} />} />
          <Route path="/lessons" element={<SubjectsPage />} />
          <Route path="/lessons/:subjectId" element={<LessonsPage session={session} />} />
          <Route path="/board/:subjectId/:lessonId" element={<MainPage session={session} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
