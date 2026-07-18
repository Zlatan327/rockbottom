// =============================================
// RockBottom — Socket.io Client Wrapper
// =============================================

let socket = null;
const listeners = new Map();

/**
 * Initialize socket connection
 */
export function initSocket() {
  if (socket) return socket;

  // Socket.io loaded via CDN in index.html or bundled
  if (typeof io === 'undefined') {
    console.warn('Socket.io not loaded yet');
    return null;
  }

  socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket() {
  return socket;
}

/**
 * Subscribe to a socket event
 */
export function on(event, callback) {
  if (!socket) return;
  socket.on(event, callback);

  // Track for cleanup
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(callback);
}

/**
 * Emit a socket event
 */
export function emit(event, data) {
  if (!socket) return;
  socket.emit(event, data);
}

/**
 * Remove event listener
 */
export function off(event, callback) {
  if (!socket) return;
  socket.off(event, callback);
}

/**
 * Join a room (e.g., milestone-specific updates)
 */
export function joinRoom(room) {
  emit('join:room', room);
}

/**
 * Leave a room
 */
export function leaveRoom(room) {
  emit('leave:room', room);
}

/**
 * Disconnect and cleanup
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

export default { initSocket, getSocket, on, emit, off, joinRoom, leaveRoom, disconnect };
