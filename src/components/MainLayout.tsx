import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, Library, Moon, LineChart } from 'lucide-react';
import Sidebar from './Sidebar';

export default function MainLayout({ session }: { session: any }) {
  const location = useLocation();
  
  // Hide bottom nav on the board page (full-screen whiteboard)
  const isBoardPage = location.pathname.startsWith('/board/');

  const mobileNavItems = [
    { name: 'الرئيسية', path: '/home', icon: Home },
    { name: 'الدروس', path: '/lessons', icon: BookOpen },
    { name: 'المكتبة', path: '#', icon: Library, disabled: true },
    { name: 'القسم الروحي', path: '#', icon: Moon, disabled: true },
    { name: 'متابعتي', path: '#', icon: LineChart, disabled: true },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar session={session} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto relative flex flex-col ${!isBoardPage ? 'pb-20 md:pb-0' : ''}`}>
        <Outlet />
      </div>

      {/* Mobile Bottom Navigation */}
      {!isBoardPage && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/70 z-50 safe-area-bottom">
          <nav className="flex items-center justify-around px-2 py-2">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.disabled ? '#' : item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-0 ${
                    item.disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : isActive
                        ? 'text-indigo-600'
                        : 'text-slate-400'
                  }`
                }
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <item.icon size={22} />
                <span className="text-[10px] font-semibold truncate">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
