let io;

module.exports = {
  init: (httpServer) => {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',')
          : ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      // Basic room joining logic
      socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
      });
      socket.on('join_admin', () => {
        socket.join('admin_room');
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
