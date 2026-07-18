const requestCounts = new Map();

// Clear counts every minute
setInterval(() => {
  requestCounts.clear();
}, 60000);

export function apiRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const count = requestCounts.get(ip) || 0;
  
  if (count >= 100) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  
  requestCounts.set(ip, count + 1);
  next();
}

export function wsRateLimiter(socket, next) {
  const ip = socket.handshake.address;
  
  socket.onAny((event, ...args) => {
    const count = requestCounts.get(`ws_${ip}`) || 0;
    if (count >= 30) {
      // Too many messages, ignore or send error event
      socket.emit('error', 'Rate limit exceeded');
      return;
    }
    requestCounts.set(`ws_${ip}`, count + 1);
  });
  
  next();
}
