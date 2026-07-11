import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Library, Moon, LineChart, LogOut, User, GraduationCap } from 'lucide-react';
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

  // Generate a consistent color from the user's name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-indigo-400 to-purple-500',
      'from-blue-400 to-cyan-500',
      'from-teal-400 to-emerald-500',
      'from-amber-400 to-orange-500',
      'from-rose-400 to-pink-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const initial = userName ? userName.charAt(0) : '؟';

  return (
    <div className="w-72 bg-gradient-to-b from-white/90 to-slate-50/90 backdrop-blur-xl border-l border-slate-200/50 flex flex-col h-screen sticky top-0 shadow-lg shadow-slate-200/20" dir="rtl">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 pb-2">
        <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200/50">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">الأستاذ</h1>
          <p className="text-[10px] text-slate-400 font-medium">مساعدك الذكي</p>
        </div>
      </div>

      {/* User card */}
      {userName && (
        <div className="mx-4 mt-4 mb-2 p-3.5 rounded-2xl bg-gradient-to-l from-indigo-50/80 to-purple-50/80 border border-indigo-100/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(userName)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{userName}</div>
              {trackName && <div className="text-[11px] text-indigo-600 font-semibold">{trackName}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-6 my-2 h-px bg-slate-100"></div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.disabled ? '#' : item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                item.disabled 
                  ? 'opacity-35 cursor-not-allowed text-slate-400' 
                  : isActive && !item.disabled
                    ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-200/50' 
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm font-medium'
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
      <div className="p-4 border-t border-slate-100/80">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50/80 rounded-xl transition-all w-full text-right text-sm font-medium group"
        >
          <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
