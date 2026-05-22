

let io;

const setIO = (socketIO) => {
  io = socketIO;
};


const emitToUser = (userId, event, data) => {
  if (!io || !userId) return;
  io.to(userId.toString()).emit(event, { ...data, timestamp: new Date() });
};


const emitToRole = (role, event, data) => {
  if (!io || !role) return;
  io.to(role).emit(event, { ...data, timestamp: new Date() });
};


const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  userIds.forEach((id) => {
    if (id) io.to(id.toString()).emit(event, { ...data, timestamp: new Date() });
  });
};

module.exports = { setIO, emitToUser, emitToRole, emitToUsers };
