'use client';
import { useState, useEffect } from 'react';
import { FileText, Gamepad2, Users, TrendingUp, Edit3, Eye } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalGames: number;
  gamesWithRules: number;
  gamesWithImages: number;
  totalRules: number;
  rulesProgress: number;
  imageProgress: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const [gamesResponse, rulesResponse] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/rules')
      ]);

      const games = await gamesResponse.json();
      const rules = await rulesResponse.json();

      const gamesWithRules = new Set(rules.map((rule: any) => rule.gameId)).size;
      const gamesWithImages = games.filter((game: any) => game.image).length;

      setStats({
        totalGames: games.length,
        gamesWithRules,
        gamesWithImages,
        totalRules: rules.length,
        rulesProgress: (gamesWithRules / games.length) * 100,
        imageProgress: (gamesWithImages / games.length) * 100
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-600 mt-2">
            Gestiona el contenido y las reglas de King Dice
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <Gamepad2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Juegos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalGames.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Juegos con Reglas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.gamesWithRules.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{stats.rulesProgress.toFixed(1)}% completado</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reglas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRules.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Juegos con Imágenes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.gamesWithImages.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{stats.imageProgress.toFixed(1)}% completado</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bars */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Reglas</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Juegos con Reglas</span>
                    <span className="text-sm text-gray-500">{stats.gamesWithRules} / {stats.totalGames}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.rulesProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Juegos con Imágenes</span>
                    <span className="text-sm text-gray-500">{stats.gamesWithImages} / {stats.totalGames}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.imageProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
              <div className="space-y-3">
                <Link 
                  href="/admin/rules"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Edit3 className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Editor de Reglas</span>
                  </div>
                  <span className="text-sm text-gray-500">Editar y gestionar reglas</span>
                </Link>

                <Link 
                  href="/reglas"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Ver Página Pública</span>
                  </div>
                  <span className="text-sm text-gray-500">Revisar el sitio público</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Scrapers Activos</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Ejecutándose
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Base de Datos</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Conectada
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Archivos Scrapeados</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  206 HTML files
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

