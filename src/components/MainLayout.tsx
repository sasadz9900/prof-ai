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
    { name: 'الروحي', path: '#', icon: Moon, disabled: true },
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-200/50 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <nav className="flex items-center justify-around px-1 py-1.5">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.disabled ? '#' : item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0 relative ${
                    item.disabled
                      ? 'opacity-25 cursor-not-allowed'
                      : isActive
                        ? 'text-indigo-600'
                        : 'text-slate-400'
                  }`
                }
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator dot */}
                    {isActive && !item.disabled && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                    )}
                    <item.icon size={22} strokeWidth={isActive && !item.disabled ? 2.5 : 1.8} />
                    <span className={`text-[10px] truncate ${isActive && !item.disabled ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
