import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Library, Moon, LineChart, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
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
    <div className="w-64 bg-white border-l border-slate-200 flex flex-col h-screen p-4 sticky top-0" dir="rtl">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
          أ
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">الأستاذ</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.disabled ? '#' : item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                item.disabled 
                  ? 'opacity-50 cursor-not-allowed text-slate-400' 
                  : isActive && !item.disabled
                    ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
            {item.disabled && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mr-auto">قريباً</span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-auto w-full text-right"
      >
        <LogOut size={20} />
        <span>تسجيل الخروج</span>
      </button>
    </div>
  );
}
