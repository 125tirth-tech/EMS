const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId ? user.employeeId.toString() : null,
      accountStatus: user.accountStatus
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authenticate;
