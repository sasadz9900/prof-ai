import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden" dir="rtl">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
