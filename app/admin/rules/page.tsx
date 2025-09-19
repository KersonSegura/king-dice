'use client';
import { useState, useEffect } from 'react';
import { Search, Save, Eye, Edit3, Upload, Download, Plus, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface Game {
  id: number;
  name: string;
  nameEn: string;
  nameEs: string;
  year: number;
  image: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
}

interface GameRule {
  id: number;
  gameId: number;
  language: string;
  rulesText: string;
  rulesHtml: string;
  setupInstructions?: string;
  victoryConditions?: string;
  game: Game;
}

export default function AdminRulesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [rules, setRules] = useState<GameRule[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedRule, setSelectedRule] = useState<GameRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'games' | 'edit' | 'preview'>('games');
  
  // Editor states
  const [editingRule, setEditingRule] = useState<Partial<GameRule>>({});
  const [editorMode, setEditorMode] = useState<'html' | 'text'>('html');

  useEffect(() => {
    fetchGames();
    fetchRules();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      const data = await response.json();
      setRules(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setIsLoading(false);
    }
  };

  const filteredGames = games.filter(game => 
    game.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.nameEs?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGameRules = (gameId: number) => {
    return rules.filter(rule => rule.gameId === gameId);
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    const gameRules = getGameRules(game.id);
    if (gameRules.length > 0) {
      setSelectedRule(gameRules[0]);
      setEditingRule(gameRules[0]);
    } else {
      // Create new rule template
      const newRule = {
        gameId: game.id,
        language: 'es',
        rulesText: '',
        rulesHtml: '',
        setupInstructions: '',
        victoryConditions: ''
      };
      setSelectedRule(null);
      setEditingRule(newRule);
    }
    setActiveTab('edit');
  };

  const handleSaveRule = async () => {
    if (!selectedGame || !editingRule) return;

    setIsSaving(true);
    try {
      const method = selectedRule ? 'PUT' : 'POST';
      const url = selectedRule ? `/api/rules/${selectedRule.id}` : '/api/rules';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editingRule,
          gameId: selectedGame.id
        }),
      });

      if (response.ok) {
        const savedRule = await response.json();
        
        // Update local state
        if (selectedRule) {
          setRules(prev => prev.map(rule => 
            rule.id === selectedRule.id ? savedRule : rule
          ));
        } else {
          setRules(prev => [...prev, savedRule]);
        }
        
        setSelectedRule(savedRule);
        alert('Reglas guardadas exitosamente!');
      } else {
        alert('Error al guardar las reglas');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Error al guardar las reglas');
    }
    setIsSaving(false);
  };

  const handleDeleteRule = async () => {
    if (!selectedRule || !confirm('¿Estás seguro de que quieres eliminar estas reglas?')) return;

    try {
      const response = await fetch(`/api/rules/${selectedRule.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules(prev => prev.filter(rule => rule.id !== selectedRule.id));
        setSelectedRule(null);
        setEditingRule({});
        setActiveTab('games');
        alert('Reglas eliminadas exitosamente!');
      } else {
        alert('Error al eliminar las reglas');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Error al eliminar las reglas');
    }
  };

  const importScrapedRule = async (gameId: number) => {
    try {
      const response = await fetch(`/api/admin/import-scraped-rule/${gameId}`);
      if (response.ok) {
        const importedRule = await response.json();
        setEditingRule(importedRule);
        alert('Reglas importadas desde archivos scrapeados!');
      } else {
        alert('No se encontraron reglas scrapeadas para este juego');
      }
    } catch (error) {
      console.error('Error importing scraped rule:', error);
      alert('Error al importar reglas scrapeadas');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando editor de reglas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Editor de Reglas</h1>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('games')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'games' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Juegos
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  disabled={!selectedGame}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'edit' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
                  }`}
                >
                  Editar
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  disabled={!editingRule.rulesHtml}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'preview' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
                  }`}
                >
                  Vista Previa
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                href="/reglas"
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Página Pública</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Seleccionar Juego</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar juegos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredGames.map((game) => {
                  const gameRules = getGameRules(game.id);
                  const hasRules = gameRules.length > 0;

                  return (
                    <div
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        {game.image && (
                          <img
                            src={game.image}
                            alt={game.name || game.nameEn}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {game.name || game.nameEn}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {game.year} • {game.minPlayers}-{game.maxPlayers} jugadores
                          </p>
                          <div className="flex items-center mt-1">
                            {hasRules ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                <FileText className="w-3 h-3 mr-1" />
                                Tiene reglas
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                Sin reglas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Edit Tab */}
        {activeTab === 'edit' && selectedGame && (
          <div className="space-y-6">
            {/* Game Info Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedGame.image && (
                    <img
                      src={selectedGame.image}
                      alt={selectedGame.name || selectedGame.nameEn}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedGame.name || selectedGame.nameEn}
                    </h2>
                    <p className="text-gray-600">
                      {selectedGame.year} • {selectedGame.minPlayers}-{selectedGame.maxPlayers} jugadores • {selectedGame.durationMinutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => importScrapedRule(selectedGame.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importar Scrapeado</span>
                  </button>
                  {selectedRule && (
                    <button
                      onClick={handleDeleteRule}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  )}
                  <button
                    onClick={handleSaveRule}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between p-4">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setEditorMode('html')}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        editorMode === 'html'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => setEditorMode('text')}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        editorMode === 'text'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Texto
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={editingRule.language || 'es'}
                    onChange={(e) => setEditingRule(prev => ({ ...prev, language: e.target.value }))}
                    className="w-32 border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Main Rules Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editorMode === 'html' ? 'Reglas (HTML)' : 'Reglas (Texto)'}
                  </label>
                  <textarea
                    value={editorMode === 'html' ? editingRule.rulesHtml || '' : editingRule.rulesText || ''}
                    onChange={(e) => setEditingRule(prev => ({
                      ...prev,
                      [editorMode === 'html' ? 'rulesHtml' : 'rulesText']: e.target.value
                    }))}
                    rows={20}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    placeholder={editorMode === 'html' 
                      ? 'Ingresa el HTML de las reglas aquí...' 
                      : 'Ingresa el texto de las reglas aquí...'
                    }
                  />
                </div>

                {/* Setup Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones de Preparación
                  </label>
                  <textarea
                    value={editingRule.setupInstructions || ''}
                    onChange={(e) => setEditingRule(prev => ({ ...prev, setupInstructions: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Instrucciones para preparar el juego..."
                  />
                </div>

                {/* Victory Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condiciones de Victoria
                  </label>
                  <textarea
                    value={editingRule.victoryConditions || ''}
                    onChange={(e) => setEditingRule(prev => ({ ...prev, victoryConditions: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Cómo se gana el juego..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && editingRule.rulesHtml && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h2>
              <div className="prose max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ __html: editingRule.rulesHtml }}
                  className="border border-gray-200 rounded-lg p-6"
                />
                
                {editingRule.setupInstructions && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparación</h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{editingRule.setupInstructions}</p>
                    </div>
                  </div>
                )}

                {editingRule.victoryConditions && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Victoria</h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{editingRule.victoryConditions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

