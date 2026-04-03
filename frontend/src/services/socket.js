import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';
import usePayoutStore from '../store/usePayoutStore';

let socket = null;

export const connectSocket = (userId) => {
  if (socket) return socket;
  
  socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001', {
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
    if (userId) {
      socket.emit('join_user', userId);
    }
  });

  socket.on('payout:success', (data) => {
    console.log('[Socket] Payout success:', data);
    usePayoutStore.getState().setLivePayoutEvent(data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
