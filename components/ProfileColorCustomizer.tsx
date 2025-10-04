'use client';

import { useState } from 'react';
import { Palette, X, Check } from 'lucide-react';

interface ProfileColors {
  cover: string;
  background: string;
  containers: string;
}

interface ColorTheme {
  name: string;
  cover: string;
  background: string;
  containers: string;
  textColor: 'light' | 'dark';
  description: string;
}

interface ProfileColorCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  currentColors: ProfileColors;
  onSave: (colors: ProfileColors) => void;
}

const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'King Dice',
    cover: '#fbae17',
    background: '#f5f5f5',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Classic yellow with dark text'
  },
  {
    name: 'Ocean Blue',
    cover: '#1e40af',
    background: '#f0f9ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Deep blue with white text'
  },
  {
    name: 'Soft Pink',
    cover: '#fce7f3',
    background: '#fdf2f8',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Soft pink with dark text'
  },
  {
    name: 'Forest Green',
    cover: '#059669',
    background: '#f0fdf4',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Natural green with white text'
  },
  {
    name: 'Light Blue',
    cover: '#dbeafe',
    background: '#eff6ff',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Light blue with dark text'
  },
  {
    name: 'Royal Purple',
    cover: '#7c3aed',
    background: '#faf5ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Rich purple with white text'
  },
  {
    name: 'Mint Green',
    cover: '#d1fae5',
    background: '#f0fdf4',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Mint green with dark text'
  },
  {
    name: 'Crimson Red',
    cover: '#dc2626',
    background: '#fef2f2',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Bold red with white text'
  },
  {
    name: 'Lavender',
    cover: '#e9d5ff',
    background: '#faf5ff',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Lavender with dark text'
  },
  {
    name: 'Midnight Dark',
    cover: '#1f2937',
    background: '#f9fafb',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Dark theme with white text'
  },
  {
    name: 'Peach',
    cover: '#fed7aa',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Peach with dark text'
  },
  {
    name: 'Indigo Deep',
    cover: '#4f46e5',
    background: '#eef2ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Deep indigo with white text'
  },
  {
    name: 'Sky Blue',
    cover: '#bae6fd',
    background: '#f0f9ff',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Sky blue with dark text'
  },
  {
    name: 'Teal Cyan',
    cover: '#0891b2',
    background: '#f0fdfa',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Fresh teal with white text'
  },
  {
    name: 'Steel Gray',
    cover: '#6b7280',
    background: '#f9fafb',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Steel gray with white text'
  },
  {
    name: 'Amber Gold',
    cover: '#d97706',
    background: '#fffbeb',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Rich gold with dark text'
  },
  {
    name: 'Rose',
    cover: '#fecaca',
    background: '#fef2f2',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Rose with dark text'
  },
  {
    name: 'Emerald Green',
    cover: '#10b981',
    background: '#ecfdf5',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Vibrant green with white text'
  },
  {
    name: 'Sage',
    cover: '#d1fae5',
    background: '#f0fdf4',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Sage green with dark text'
  },
  {
    name: 'Rose Pink',
    cover: '#e11d48',
    background: '#fff1f2',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Elegant pink with white text'
  },
  {
    name: 'Cream',
    cover: '#fef3c7',
    background: '#fffbeb',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Cream with dark text'
  },
  {
    name: 'Sunset Orange',
    cover: '#ea580c',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Warm orange with white text'
  },
  {
    name: 'Powder Blue',
    cover: '#dbeafe',
    background: '#eff6ff',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Powder blue with dark text'
  },
  {
    name: 'Electric Blue',
    cover: '#2563eb',
    background: '#eff6ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Electric blue with white text'
  },
  {
    name: 'Coral',
    cover: '#fed7d7',
    background: '#fef2f2',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Coral with dark text'
  },
  {
    name: 'Lime Green',
    cover: '#65a30d',
    background: '#f7fee7',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Bright lime with white text'
  },
  {
    name: 'Fuchsia Pink',
    cover: '#c026d3',
    background: '#fdf4ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Vibrant fuchsia with white text'
  },
  {
    name: 'Sky Blue',
    cover: '#0ea5e9',
    background: '#f0f9ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Sky blue with white text'
  },
  {
    name: 'Lime Yellow',
    cover: '#eab308',
    background: '#fefce8',
    containers: '#ffffff',
    textColor: 'dark',
    description: 'Bright lime yellow with dark text'
  },
  {
    name: 'Violet Purple',
    cover: '#8b5cf6',
    background: '#faf5ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Violet purple with white text'
  },
  {
    name: 'Coral Red',
    cover: '#f97316',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Coral red with white text'
  },
  {
    name: 'Mint Green',
    cover: '#06b6d4',
    background: '#f0fdfa',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Mint green with white text'
  },
  {
    name: 'Hot Pink',
    cover: '#ec4899',
    background: '#fdf2f8',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Hot pink with white text'
  },
  {
    name: 'Turquoise',
    cover: '#14b8a6',
    background: '#f0fdfa',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Turquoise with white text'
  },
  {
    name: 'Lavender',
    cover: '#a855f7',
    background: '#faf5ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Lavender with white text'
  },
  {
    name: 'Peach',
    cover: '#fb923c',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Peach with white text'
  },
  {
    name: 'Forest Deep',
    cover: '#14532d',
    background: '#f0fdf4',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Deep forest green with white text'
  },
  {
    name: 'Burnt Orange',
    cover: '#ea580c',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Burnt orange with white text'
  },
  {
    name: 'Navy Blue',
    cover: '#1e40af',
    background: '#eff6ff',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Navy blue with white text'
  },
  {
    name: 'Burgundy',
    cover: '#7c2d12',
    background: '#fef2f2',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Burgundy with white text'
  },
  {
    name: 'Olive Green',
    cover: '#4d7c0f',
    background: '#f7fee7',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Olive green with white text'
  },
  {
    name: 'Rust Brown',
    cover: '#a16207',
    background: '#fffbeb',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Rust brown with white text'
  },
  {
    name: 'Slate Gray',
    cover: '#64748b',
    background: '#f8fafc',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Slate gray with white text'
  },
  {
    name: 'Wine Red',
    cover: '#991b1b',
    background: '#fef2f2',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Wine red with white text'
  },
  {
    name: 'Sage Green',
    cover: '#22c55e',
    background: '#f0fdf4',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Sage green with white text'
  },
  {
    name: 'Copper',
    cover: '#d97706',
    background: '#fffbeb',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Copper with white text'
  },
  {
    name: 'Charcoal',
    cover: '#1f2937',
    background: '#f9fafb',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Charcoal with white text'
  },
  {
    name: 'Maroon',
    cover: '#991b1b',
    background: '#fff7ed',
    containers: '#ffffff',
    textColor: 'light',
    description: 'Maroon with white text'
  }
];

const THEMES_PER_PAGE = 12;

export default function ProfileColorCustomizer({ isOpen, onClose, currentColors, onSave }: ProfileColorCustomizerProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(COLOR_THEMES.length / THEMES_PER_PAGE);
  const startIndex = (currentPage - 1) * THEMES_PER_PAGE;
  const endIndex = startIndex + THEMES_PER_PAGE;
  const currentThemes = COLOR_THEMES.slice(startIndex, endIndex);

  const handleThemeSelect = (theme: ColorTheme) => {
    setSelectedTheme(theme.name);
  };

  const handleSave = () => {
    const theme = COLOR_THEMES.find(t => t.name === selectedTheme);
    if (theme) {
      onSave({
        cover: theme.cover,
        background: theme.background,
        containers: theme.containers
      });
    }
    onClose();
  };

  const getPageTitle = (page: number) => {
    return `Color Themes`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pt-16"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#fbae17]/20 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-[#fbae17]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Choose Your Theme</h2>
              <p className="text-sm text-gray-600">{getPageTitle(currentPage)} • Page {currentPage} of {totalPages}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentThemes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeSelect(theme)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTheme === theme.name
                    ? 'border-[#fbae17] bg-[#fbae17]/5 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  {/* Color Preview */}
                  <div className="space-y-2">
                    <div 
                      className="h-12 rounded-lg border border-gray-200 relative overflow-hidden"
                      style={{ backgroundColor: theme.cover }}
                    >
                      {/* Text color indicator */}
                      <div className={`absolute top-2 left-2 text-xs font-bold ${
                        theme.textColor === 'light' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {theme.textColor === 'light' ? 'WHITE TEXT' : 'DARK TEXT'}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <div 
                        className="w-8 h-6 rounded border border-gray-200"
                        style={{ backgroundColor: theme.background }}
                      ></div>
                      <div 
                        className="w-8 h-6 rounded border border-gray-200"
                        style={{ backgroundColor: theme.containers }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Theme Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                    <p className="text-sm text-gray-600">{theme.description}</p>
                  </div>
                  
                  {/* Selection Indicator */}
                  {selectedTheme === theme.name && (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-[#fbae17] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Next
            </button>
          </div>
          
          {/* Page Dots */}
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentPage === i + 1 ? 'bg-[#fbae17]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedTheme}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
              selectedTheme
                ? 'bg-[#fbae17] hover:bg-[#fbae17]/90 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Apply Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
}