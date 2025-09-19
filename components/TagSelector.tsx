'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagSelector({ selectedTags, onTagsChange, placeholder = "Select or create tags..." }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags?popular=true&limit=50');
        const data = await response.json();
        setAvailableTags(data.tags || []);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedTags.includes(tag.name)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(value.length > 0);
  };

  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const handleTagRemove = (tagName: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagName));
  };

  const handleCreateTag = async () => {
    const tagName = inputValue.trim().toLowerCase();
    if (!tagName || selectedTags.includes(tagName)) {
      setInputValue('');
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tagName }),
      });

      if (response.ok) {
        const data = await response.json();
        onTagsChange([...selectedTags, tagName]);
        setAvailableTags(prev => [...prev, data.tag]);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsLoading(false);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleTagSelect(filteredTags[0].name);
      } else {
        handleCreateTag();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 border border-gray-300 rounded-md bg-white">
        {selectedTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleTagRemove(tag)}
              className="hover:bg-blue-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(inputValue.length > 0)}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
          placeholder={selectedTags.length === 0 ? placeholder : ""}
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredTags.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Popular tags:</div>
              {filteredTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag.name)}
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center justify-between"
                >
                  <span>{tag.name}</span>
                  <span className="text-xs text-gray-400">({tag.count})</span>
                </button>
              ))}
            </div>
          )}
          
          {inputValue && !availableTags.some(tag => tag.name === inputValue.toLowerCase()) && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isLoading}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center gap-2 text-green-600"
              >
                <Plus className="w-3 h-3" />
                {isLoading ? 'Creating...' : `Create "${inputValue}"`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
