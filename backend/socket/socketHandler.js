

const socketHandler = (io) => {

  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

 
    socket.on('join', ({ userId, role }) => {
      if (!userId || !role) return;

      socket.join(userId.toString());
      socket.join(role);             

      onlineUsers.set(userId.toString(), socket.id);
      socket.userId = userId.toString();
      socket.role   = role;

      console.log(`[Socket] User joined → userId: ${userId}, role: ${role}`);

     
      socket.to('admin').emit('user_online', { userId, role });
    });

  
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        socket.to('admin').emit('user_offline', {
          userId: socket.userId,
          role:   socket.role,
        });
        console.log(`[Socket] Disconnected: userId ${socket.userId}`);
      } else {
        console.log(`[Socket] Disconnected: ${socket.id}`);
      }
    });


    socket.on('ping', () => socket.emit('pong'));
  });
};

module.exports = socketHandler;

