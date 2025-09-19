'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Download, Eye, Search, Filter, ExternalLink, FileText, Calendar, Users, Clock } from 'lucide-react';
import Link from 'next/link';

interface GameRule {
  id: number;
  gameId: number;
  language: string;
  rulesText: string;
  rulesHtml?: string;
  setupInstructions?: string;
  victoryConditions?: string;
  game: {
    id: number;
    name: string;
    nameEn: string;
    image?: string;
    year?: number;
    minPlayers?: number;
    maxPlayers?: number;
    durationMinutes?: number;
  };
}

export default function RulesPage() {
  const [rules, setRules] = useState<GameRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<GameRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<GameRule | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/rules');
        const data = await response.json();
        setRules(data);
        setFilteredRules(data);
      } catch (error) {
        console.error('Error fetching rules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRules();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRules(rules);
    } else {
      const filtered = rules.filter(rule =>
        rule.game.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.game.nameEn?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRules(filtered);
    }
  }, [searchTerm, rules]);

  const handleViewRule = (rule: GameRule) => {
    setSelectedRule(rule);
  };

  const closeModal = () => {
    setSelectedRule(null);
  };

  return (
    <div>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-dark-900 mb-4">
              Reglas de Juegos
            </h1>
            <p className="text-lg text-dark-600 mb-8">
              Encuentra las reglas de tus juegos favoritos - ¡{rules.length} juegos con reglas disponibles!
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">
              Busca las reglas de tu juego
            </h2>
            <p className="text-dark-600">
              Escribe el nombre del juego para encontrar sus reglas en español
            </p>
          </div>

          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Busca un juego... (ej: Catan, Wingspan, Exploding Kittens)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-dark-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">
              ¿Por qué nuestras reglas?
            </h2>
            <p className="text-lg text-dark-600">
              Traducciones profesionales y verificadas por la comunidad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 mb-2">Traducción Profesional</h3>
              <p className="text-dark-600">
                Reglas traducidas por expertos en juegos de mesa y el idioma español
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 mb-2">Verificadas</h3>
              <p className="text-dark-600">
                Cada traducción es revisada y verificada por la comunidad
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 mb-2">Descargables</h3>
              <p className="text-dark-600">
                Descarga las reglas en PDF para imprimir o usar offline
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rules Display Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="mt-4 text-dark-600">Cargando reglas...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-dark-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-900 mb-2">
                {searchTerm ? 'No se encontraron juegos' : 'No hay reglas disponibles'}
              </h3>
              <p className="text-dark-600">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Estamos trabajando para agregar más reglas'}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-dark-900">
                  {searchTerm ? `Resultados para "${searchTerm}"` : 'Todas las Reglas'}
                </h2>
                <span className="text-dark-600">
                  {filteredRules.length} juego{filteredRules.length !== 1 ? 's' : ''} encontrado{filteredRules.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-dark-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-dark-900 mb-2">
                            {rule.game.name || rule.game.nameEn}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-dark-600 mb-3">
                            {rule.game.year && (
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {rule.game.year}
                              </span>
                            )}
                            {rule.game.minPlayers && rule.game.maxPlayers && (
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {rule.game.minPlayers}-{rule.game.maxPlayers}
                              </span>
                            )}
                            {rule.game.durationMinutes && (
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {rule.game.durationMinutes}min
                              </span>
                            )}
                          </div>
                          <p className="text-dark-600 text-sm line-clamp-3">
                            {rule.rulesText.substring(0, 150)}...
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {rule.language === 'en' ? 'English' : rule.language === 'es' ? 'Español' : rule.language}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {rule.rulesHtml ? 'HTML' : 'Texto'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewRule(rule)}
                          className="btn-primary text-sm py-2 px-4 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-dark-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-500 mb-2">{rules.length}</div>
              <div className="text-dark-600">Juegos con Reglas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-500 mb-2">2,490+</div>
              <div className="text-dark-600">Imágenes de Reglas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-500 mb-2">156+</div>
              <div className="text-dark-600">Archivos HTML</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-500 mb-2">24/7</div>
              <div className="text-dark-600">Disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* Rules Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-200">
              <div>
                <h3 className="text-xl font-semibold text-dark-900">
                  {selectedRule.game.name || selectedRule.game.nameEn}
                </h3>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    {selectedRule.language === 'en' ? 'English' : selectedRule.language === 'es' ? 'Español' : selectedRule.language}
                  </span>
                  {selectedRule.game.year && (
                    <span className="text-dark-600 text-sm">• {selectedRule.game.year}</span>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-dark-400 hover:text-dark-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedRule.rulesHtml ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedRule.rulesHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-dark-700">
                  {selectedRule.rulesText}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-dark-200 bg-dark-50">
              <div className="text-sm text-dark-600">
                Reglas obtenidas de fuentes oficiales y verificadas
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/juego/${selectedRule.gameId}`}
                  className="btn-secondary text-sm py-2 px-4 flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Juego</span>
                </Link>
                <button
                  onClick={closeModal}
                  className="btn-primary text-sm py-2 px-4"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 