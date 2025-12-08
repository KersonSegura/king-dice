'use client';

import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Users, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  username: string;
  avatar: string;
  isVerified?: boolean;
  isAdmin?: boolean;
}

interface ViewMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  groupName: string;
}

export default function ViewMembersModal({ 
  isOpen, 
  onClose, 
  members,
  groupName
}: ViewMembersModalProps) {
  const { user } = useAuth();
  const [followStatuses, setFollowStatuses] = useState<{[userId: string]: boolean}>({});
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  // Check follow status for all members when modal opens
  useEffect(() => {
    if (isOpen && user?.id && members.length > 0) {
      checkFollowStatuses();
    }
  }, [isOpen, user?.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
      // Reset states when modal closes
      setFollowStatuses({});
      setUpdatingUsers(new Set());
    }

    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  // Check follow status for all members
  const checkFollowStatuses = async () => {
    if (!user?.id || members.length === 0) return;

    try {
      // Check follow status for each member (except current user)
      const otherMembers = members.filter(m => m.id !== user.id);
      
      for (const member of otherMembers) {
        try {
          const response = await fetch(`/api/follow?followerId=${user.id}&followingId=${member.id}`);
          if (response.ok) {
            const data = await response.json();
            setFollowStatuses(prev => ({
              ...prev,
              [member.id]: data.isFollowing || false
            }));
          }
        } catch (error) {
          console.error(`Error checking follow status for ${member.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking follow statuses:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollow = async (memberId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.id || updatingUsers.has(memberId)) return;
    if (memberId === user.id) return; // Can't follow yourself

    setUpdatingUsers(prev => new Set(prev).add(memberId));
    try {
      const isFollowing = followStatuses[memberId] || false;
      const action = isFollowing ? 'unfollow' : 'follow';
      
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          followerId: user.id,
          followingId: memberId
        })
      });
      
      if (response.ok) {
        const newStatus = !isFollowing;
        setFollowStatuses(prev => ({ ...prev, [memberId]: newStatus }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const handleResultClick = () => {
    // Don't close modal on link click, only on button click
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" style={{ transform: 'translateY(-20vh)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Members of {groupName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          {members.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <p>No members found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member) => {
                const isCurrentUser = member.id === user?.id;
                const isFollowing = followStatuses[member.id] || false;
                const isUpdating = updatingUsers.has(member.id);
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <Link
                      href={`/profile/${member.username}`}
                      onClick={handleResultClick}
                      className="flex items-center space-x-3 flex-1 min-w-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                          {member.avatar ? (
                            <Image
                              src={member.avatar}
                              alt={member.username || 'User'}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            member.username.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {member.username}
                          </h3>
                          {member.isVerified && (
                            <span className="text-xs text-blue-500">✓ Verified</span>
                          )}
                          {member.isAdmin && (
                            <span className="text-xs text-red-500">Admin</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    {!isCurrentUser && (
                      <button
                        onClick={(e) => handleFollow(member.id, e)}
                        disabled={isUpdating}
                        className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        style={{
                          backgroundColor: isFollowing ? '#f3f4f6' : '#3b82f6',
                          color: isFollowing ? '#374151' : '#ffffff',
                          border: isFollowing ? '1px solid #d1d5db' : 'none'
                        }}
                        title={isFollowing ? 'Unfollow' : 'Follow'}
                      >
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            <span className="hidden sm:inline">Unfollow</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

