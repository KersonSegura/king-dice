import { ReactNode } from 'react';
import Link from 'next/link';
import { Settings, FileText, Users, BarChart3, Home } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">KD</span>
                </div>
                <span className="text-xl font-bold text-gray-900">King Dice Admin</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <Home className="w-4 h-4" />
                <span>Volver al Sitio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <Link 
              href="/admin"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-gray-300 hover:text-white"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/admin/rules"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-primary-500"
            >
              <FileText className="w-4 h-4" />
              <span>Editor de Reglas</span>
            </Link>
            <Link 
              href="/admin/games"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-gray-300 hover:text-white"
            >
              <Settings className="w-4 h-4" />
              <span>Gestión de Juegos</span>
            </Link>
            <Link 
              href="/admin/users"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-gray-300 hover:text-white"
            >
              <Users className="w-4 h-4" />
              <span>Usuarios</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

