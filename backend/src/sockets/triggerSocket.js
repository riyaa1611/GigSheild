const socketModule = require('../socket');

const emitTriggerNew = (triggerData) => {
  try {
    const io = socketModule.getIo();
    io.to('admin_room').emit('trigger:new', triggerData);
  } catch(e) { console.error('Socket emit fail', e); }
};

const emitClaimFlagged = (claimData) => {
  try {
    const io = socketModule.getIo();
    io.to('admin_room').emit('claim:flagged', claimData);
  } catch(e) { console.error('Socket emit fail', e); }
};

module.exports = {
  emitTriggerNew,
  emitClaimFlagged
};
