'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, MoreVertical, Users, Phone, Video, Search, Paperclip } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import EmojiPicker from './EmojiPicker';
import ChatBot from './ChatBot';
import { useToast } from './Toast';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    isAdmin: boolean;
  };
  type: string;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      username: string;
      avatar: string;
    };
  };
  createdAt: string;
}

interface ChatProps {
  chatId: string;
  chatName: string;
  chatType: 'direct' | 'group' | 'bot';
  participants: any[];
  onClose: () => void;
}

export default function Chat({ chatId, chatName, chatType, participants, onClose }: ChatProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // If it's a bot chat, render the ChatBot component
  if (chatType === 'bot') {
    return (
      <div className="h-96 bg-white rounded-lg shadow-lg">
        <ChatBot
          isOpen={true}
          onClose={onClose}
          currentUser={user}
        />
      </div>
    );
  }

  // TypeScript assertion: after the bot check, chatType can only be 'direct' | 'group'
  const regularChatType = chatType as 'direct' | 'group';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages and mark as read
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
          
          // Mark messages as read when chat is opened
          if (user?.id) {
            try {
              await fetch('/api/messages/unread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, chatId })
              });
              console.log('✅ Messages marked as read');
            } catch (readError) {
              console.error('Error marking messages as read:', readError);
              // Don't show error to user - this is not critical
            }
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Failed to load messages', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatId, showToast, user?.id]);

  // Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join chat room
    socket.emit('join-chat', chatId);

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('user-typing', (data: { userId: string; username?: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return { ...prev, [data.userId]: data.username || 'Someone' };
          } else {
            const newTyping = { ...prev };
            delete newTyping[data.userId];
            return newTyping;
          }
        });
      }
    });

    return () => {
      socket.emit('leave-chat', chatId);
      socket.off('new-message');
      socket.off('user-typing');
    };
  }, [socket, isConnected, chatId, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      chatId,
      senderId: user.id,
      content: newMessage.trim(),
      type: 'text',
      replyToId: replyingTo?.id
    };

    try {
      // Emit to socket for real-time updates and database saving
      if (socket && isConnected) {
        console.log('Sending message via socket:', messageData);
        socket.emit('send-message', messageData);
        setNewMessage('');
        setReplyingTo(null);
      } else {
        // Fallback: Save directly to API if socket is not available
        console.log('Socket not available, saving via API:', messageData);
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          setReplyingTo(null);
          showToast('Message sent', 'success');
        } else {
          showToast('Failed to send message', 'error');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket && isConnected) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing start
      socket.emit('typing-start', {
        chatId,
        userId: user?.id,
        username: user?.username
      });

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { chatId, userId: user?.id });
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = () => {
    if (chatType === 'direct') {
      return participants.find(p => p.id !== user?.id);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-96 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            {regularChatType === 'group' ? (
              // Group chat icon
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden bg-blue-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            ) : regularChatType === 'direct' ? (
              // User avatar (clickable to profile)
              <button
                onClick={() => {
                  const otherUser = getOtherParticipant();
                  if (otherUser) {
                    window.location.href = `/profile/${otherUser.username}`;
                  }
                }}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
              >
                {getOtherParticipant()?.avatar ? (
                  <img
                    src={getOtherParticipant()?.avatar}
                    alt={getOtherParticipant()?.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {getOtherParticipant()?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ) : (
              // Group chat avatar
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                  {chatName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{chatName}</h3>
              <p className="text-sm text-gray-500">
                {regularChatType === 'direct' ?
                  getOtherParticipant()?.isVerified ? '✓ Verified' : 'Online' :
                  `${participants.length} members`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'} items-end space-x-2`}
            >
             {/* Avatar for other users */}
             {message.senderId !== user?.id && (
               <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                 {message.sender.username === 'Dice-Bot' ? (
                   <div className="w-full h-full bg-white flex items-center justify-center">
                     <img
                       src="/DiceBotIcon.svg"
                       alt="Dice-Bot"
                       className="w-full h-full object-cover"
                     />
                   </div>
                 ) : (
                   <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                     {message.sender.avatar ? (
                       <img
                         src={message.sender.avatar}
                         alt={message.sender.username}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       message.sender.username.charAt(0).toUpperCase()
                     )}
                   </div>
                 )}
               </div>
             )}
              
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {message.replyTo && (
                  <div className={`text-xs mb-1 p-2 rounded ${
                    message.senderId === user?.id ? 'bg-blue-400' : 'bg-gray-200'
                  }`}>
                    <div className="font-semibold">Replying to {message.replyTo.sender.username}</div>
                    <div className="truncate">{message.replyTo.content}</div>
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.createdAt)}
                </div>
              </div>

             {/* Avatar for current user */}
             {message.senderId === user?.id && (
               <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                 <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                   {user.avatar ? (
                     <img
                       src={user.avatar}
                       alt={user.username}
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     user.username.charAt(0).toUpperCase()
                   )}
                 </div>
               </div>
             )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Replying to {replyingTo.sender.username}: {replyingTo.content}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
      />

      <ToastContainer />
    </>
  );
}
