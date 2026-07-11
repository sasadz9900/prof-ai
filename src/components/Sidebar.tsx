import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Library, Moon, LineChart, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export default function Sidebar({ session }: { session: any }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [trackName, setTrackName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase || !session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, track_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile) {
        setUserName(profile.full_name || session.user.email?.split('@')[0] || '');
        if (profile.track_id) {
          const { data: track } = await supabase
            .from('tracks')
            .select('name')
            .eq('id', profile.track_id)
            .single();
          if (track) setTrackName(track.name);
        }
      }
    };
    fetchProfile();
  }, [session]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'الرئيسية', path: '/home', icon: Home },
    { name: 'الدروس', path: '/lessons', icon: BookOpen },
    { name: 'المكتبة', path: '#', icon: Library, disabled: true },
    { name: 'القسم الروحي', path: '#', icon: Moon, disabled: true },
    { name: 'متابعتي', path: '#', icon: LineChart, disabled: true },
  ];

  return (
    <div className="w-72 bg-white/80 backdrop-blur-xl border-l border-slate-200/70 flex flex-col h-screen sticky top-0" dir="rtl">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 pb-2">
        <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200/50">
          أ
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">الأستاذ</h1>
          <p className="text-[10px] text-slate-400 font-medium">مساعدك الذكي</p>
        </div>
      </div>

      {/* User card */}
      {userName && (
        <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-gradient-to-l from-indigo-50 to-purple-50 border border-indigo-100/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{userName}</div>
              {trackName && <div className="text-[10px] text-indigo-600 font-semibold">{trackName}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4 pt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.disabled ? '#' : item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                item.disabled 
                  ? 'opacity-40 cursor-not-allowed text-slate-400' 
                  : isActive && !item.disabled
                    ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-200/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`
            }
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
            {item.disabled && (
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mr-auto font-semibold">قريباً</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full text-right text-sm font-medium"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
