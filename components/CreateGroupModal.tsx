'use client';

import React, { useState } from 'react';
import { X, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './Toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chat: any) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user and already selected users
        const filtered = data.users.filter((u: any) => 
          u.id !== user?.id && !selectedUsers.includes(u.id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddUser = (user: any) => {
    if (!selectedUsers.includes(user.id)) {
      setSelectedUsers([...selectedUsers, user.id]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      showToast('Please enter a group name and select at least one member', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName.trim(),
          participants: [user?.id, ...selectedUsers],
          createdBy: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        onGroupCreated(data.chat);
        showToast('Group created successfully!', 'success');
        onClose();
        setGroupName('');
        setSelectedUsers([]);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create group', 'error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showToast('Failed to create group', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Create Group Chat</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Add Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="Search users..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Members */}
            {selectedUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Members ({selectedUsers.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    // In a real app, you'd store user data with the selected users
                    return (
                      <div
                        key={userId}
                        className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                      >
                        <span>User {userId}</span>
                        <button
                          onClick={() => handleRemoveUser(userId)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create Button */}
            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading || !groupName.trim() || selectedUsers.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{loading ? 'Creating...' : 'Create Group'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
