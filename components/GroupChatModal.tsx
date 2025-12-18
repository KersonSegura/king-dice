'use client';

import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Users, Search, Plus, Check } from 'lucide-react';
import LoadingLogo from './LoadingLogo';

interface User {
  id: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  isAdmin: boolean;
}

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, selectedUsers: User[]) => void;
  currentUser: User;
  initialUser?: User | null; // Pre-select a user when creating group from search results
  existingChatId?: string | null; // If provided, we're adding people to an existing group
  existingParticipants?: User[]; // Existing participants to filter out from search
  onAddParticipants?: (userIds: string[]) => Promise<void>; // Callback when adding to existing group
}

export default function GroupChatModal({ 
  isOpen, 
  onClose, 
  onCreateGroup, 
  currentUser,
  initialUser,
  existingChatId,
  existingParticipants = [],
  onAddParticipants
}: GroupChatModalProps) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user, already selected users, and existing participants
        const filteredUsers = (data.users || []).filter((u: User) => 
          u.id !== currentUser?.id && 
          !selectedUsers.find(selected => selected.id === u.id) &&
          !existingParticipants.find(existing => existing.id === u.id)
        );
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers, existingParticipants]);

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Create group or add participants
  const handleCreateGroup = async () => {
    if (existingChatId && onAddParticipants) {
      // Adding to existing group
      if (selectedUsers.length === 0) {
        return;
      }
      const userIds = selectedUsers.map(u => u.id);
      await onAddParticipants(userIds);
      // Reset form
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      onClose();
    } else {
      // Creating new group
      if (!groupName.trim() || selectedUsers.length === 0) {
        return;
      }
      onCreateGroup(groupName.trim(), selectedUsers);
      // Reset form
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      onClose();
    }
  };

  // Reset form when modal closes or set initial user when opening
  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    } else if (initialUser) {
      // Pre-select the initial user when modal opens
      setSelectedUsers([initialUser]);
    }
  }, [isOpen, initialUser]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50" 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" 
        style={{ transform: 'translateY(-20vh)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {existingChatId ? 'Add People to Group' : 'Create Group Chat'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Group Name Input - only show when creating new group */}
          {!existingChatId && (
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Members ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span>{user.username}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Search */}
          <div className="p-4 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingLogo size={36} text="Searching..." />
              </div>
            ) : !hasSearched ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Users className="w-8 h-8 mb-2" />
                <p>Search for users to add to your group</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map(user => {
                  const isSelected = selectedUsers.find(u => u.id === user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {user.username}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {user.isVerified && (
                            <span className="text-xs text-blue-500">✓ Verified</span>
                          )}
                          {user.isAdmin && (
                            <span className="text-xs text-red-500">Admin</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={existingChatId ? selectedUsers.length === 0 : (!groupName.trim() || selectedUsers.length === 0)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingChatId ? `Add People (${selectedUsers.length})` : `Create Group (${selectedUsers.length + 1})`}
          </button>
        </div>
      </div>
    </div>
  );
}
