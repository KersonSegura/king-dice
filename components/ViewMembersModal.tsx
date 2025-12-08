'use client';

import React from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
  // Lock body scroll when modal is open
  React.useEffect(() => {
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

  const handleResultClick = () => {
    onClose();
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
              {members.map((member) => (
                <Link
                  key={member.id}
                  href={`/profile/${member.username}`}
                  onClick={handleResultClick}
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
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
              ))}
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

