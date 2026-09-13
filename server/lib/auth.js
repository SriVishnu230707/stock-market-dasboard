const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret-change-me")) {
  console.warn("[security] WARNING: Insecure default JWT_SECRET detected in production! Set JWT_SECRET in .env");
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = verifyToken(token); // { sub, email, name }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Socket.IO connections carry the JWT in the handshake auth payload rather
// than a header. If a valid token is provided, socket.user is populated for
// private rooms (like alerts); if missing or expired, the socket connects
// as a guest to continue receiving public market ticker updates.
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = null;
    return next();
  }
  try {
    socket.user = verifyToken(token);
    next();
  } catch (err) {
    console.warn(`[socket] Auth token verification failed (${err.message}). Connecting as guest.`);
    socket.user = null;
    next();
  }
}

module.exports = { signToken, verifyToken, requireAuth, socketAuth, JWT_SECRET };
