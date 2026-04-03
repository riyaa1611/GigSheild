const socketModule = require('../socket');

const emitPayoutSuccess = (userId, data) => {
  try {
    const io = socketModule.getIo();
    io.to(`user_${userId}`).emit('payout:success', data);
  } catch(e) { console.error('Socket emit fail', e); }
};

const emitPayoutFailed = (adminData) => {
  try {
    const io = socketModule.getIo();
    io.to('admin_room').emit('payout:failed', adminData);
  } catch(e) { console.error('Socket emit fail', e); }
};

module.exports = {
  emitPayoutSuccess,
  emitPayoutFailed
};
