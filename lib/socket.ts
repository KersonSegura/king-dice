import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const SocketHandler = (req: any, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });
    res.socket.server.io = io;

    // Store online users globally
    const onlineUsers = new Map<string, { userId: string; username: string; socketId: string; lastSeen: string }>();
    
    // Store users in specific chat rooms
    const chatRoomUsers = new Map<string, Set<string>>();

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Join user to their personal room
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Handle user going online
      socket.on('user-online', (data: { userId: string; username: string }) => {
        onlineUsers.set(data.userId, {
          userId: data.userId,
          username: data.username,
          socketId: socket.id,
          lastSeen: new Date().toISOString()
        });
        
        // Broadcast to all clients that user is online
        socket.broadcast.emit('user-status', {
          userId: data.userId,
          isOnline: true,
          user: onlineUsers.get(data.userId)
        });
        
        // Send current online users to the newly connected user
        socket.emit('online-users', Array.from(onlineUsers.values()));
      });

      // Join a chat room
      socket.on('join-chat', (chatId: string) => {
        socket.join(`chat-${chatId}`);
        console.log(`Socket ${socket.id} joined chat ${chatId}`);
        
        // Track users in specific chat rooms
        if (!chatRoomUsers.has(chatId)) {
          chatRoomUsers.set(chatId, new Set());
        }
        
        // Find the user associated with this socket
        const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
        if (user) {
          chatRoomUsers.get(chatId)!.add(user.userId);
          
          // Broadcast updated user count for this specific chat room
          const roomUserCount = chatRoomUsers.get(chatId)!.size;
          io.to(`chat-${chatId}`).emit('chat-user-count', {
            chatId,
            userCount: roomUserCount
          });
          
          console.log(`User ${user.username} joined chat ${chatId}. Room now has ${roomUserCount} users.`);
        }
      });

      // Leave a chat room
      socket.on('leave-chat', (chatId: string) => {
        socket.leave(`chat-${chatId}`);
        console.log(`Socket ${socket.id} left chat ${chatId}`);
        
        // Remove user from chat room tracking
        const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
        if (user && chatRoomUsers.has(chatId)) {
          chatRoomUsers.get(chatId)!.delete(user.userId);
          
          // Broadcast updated user count for this specific chat room
          const roomUserCount = chatRoomUsers.get(chatId)!.size;
          io.to(`chat-${chatId}`).emit('chat-user-count', {
            chatId,
            userCount: roomUserCount
          });
          
          console.log(`User ${user.username} left chat ${chatId}. Room now has ${roomUserCount} users.`);
        }
      });

      // Handle new message
      socket.on('send-message', async (data: {
        chatId: string;
        content: string;
        senderId: string;
        type?: string;
        replyToId?: string;
      }) => {
        try {
          // Save message to database
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          
          const message = await prisma.message.create({
            data: {
              chatId: data.chatId,
              senderId: data.senderId,
              content: data.content,
              type: data.type || 'text',
              replyToId: data.replyToId
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  title: true,
                  isVerified: true,
                  isAdmin: true
                }
              },
              replyTo: {
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                      avatar: true,
                      title: true
                    }
                  }
                }
              }
            }
          });

          // Update chat's updatedAt timestamp
          await prisma.chat.update({
            where: { id: data.chatId },
            data: { updatedAt: new Date() }
          });

          await prisma.$disconnect();

          // Broadcast message to all users in the chat
          socket.to(`chat-${data.chatId}`).emit('new-message', message);
          
          // Also send to sender for confirmation
          socket.emit('message-sent', message);
        } catch (error) {
          console.error('Error saving message:', error);
          socket.emit('message-error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { chatId: string; userId: string; username: string }) => {
        socket.to(`chat-${data.chatId}`).emit('user-typing', {
          userId: data.userId,
          username: data.username,
          isTyping: true,
        });
      });

      socket.on('typing-stop', (data: { chatId: string; userId: string }) => {
        socket.to(`chat-${data.chatId}`).emit('user-typing', {
          userId: data.userId,
          isTyping: false,
        });
      });

      // Handle user going offline
      socket.on('user-offline', (data: { userId: string }) => {
        const user = onlineUsers.get(data.userId);
        if (user) {
          onlineUsers.delete(data.userId);
          
          // Broadcast to all clients that user is offline
          socket.broadcast.emit('user-status', {
            userId: data.userId,
            isOnline: false,
            user: user
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find and remove user from online list
        for (const [userId, user] of onlineUsers.entries()) {
          if (user.socketId === socket.id) {
            onlineUsers.delete(userId);
            
            // Remove user from all chat rooms
            for (const [chatId, userSet] of chatRoomUsers.entries()) {
              if (userSet.has(userId)) {
                userSet.delete(userId);
                
                // Broadcast updated user count for this chat room
                const roomUserCount = userSet.size;
                io.to(`chat-${chatId}`).emit('chat-user-count', {
                  chatId,
                  userCount: roomUserCount
                });
                
                console.log(`User ${user.username} disconnected from chat ${chatId}. Room now has ${roomUserCount} users.`);
              }
            }
            
            // Broadcast to all clients that user is offline
            socket.broadcast.emit('user-status', {
              userId: userId,
              isOnline: false,
              user: user
            });
            break;
          }
        }
      });
    });
  }
  res.end();
};
