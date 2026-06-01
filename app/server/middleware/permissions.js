const Membership = require('../models/Membership');

/**
 * Middleware to check if user has specific roles in a room.
 * @param {string[]} allowedRoles - Array of roles allowed (owner, admin, member)
 */
const checkRoomRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { roomId, id } = req.params;
      const targetRoomId = roomId || id;
      const userId = req.user.uid;

      if (!targetRoomId) {
        return res.status(400).json({ error: 'Room ID required for permission check' });
      }

      const membership = await Membership.findOne({ roomId: targetRoomId, userId }).lean();

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ 
          error: 'PERMISSION_DENIED', 
          message: `Required roles: ${allowedRoles.join(', ')}` 
        });
      }

      req.roomRole = membership.role;
      next();
    } catch (err) {
      console.error('[Middleware/Permissions] Error:', err.message);
      res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};

module.exports = {
  checkRoomRole,
  isOwner: checkRoomRole(['owner']),
  isAdmin: checkRoomRole(['owner', 'admin']),
};
