/**
 * Socket helper to add timeout to callbacks
 * Prevents UI from hanging if server doesn't respond
 * 
 * Usage:
 * import { socketEmitWithTimeout } from '../utils/socketHelper';
 * socketEmitWithTimeout(socket, 'start-game', null, (response) => {
 *   // Handle response
 * });
 */
export const socketEmitWithTimeout = (socket, event, data, callback, timeout = 10000) => {
  let timeoutId;
  let responded = false;

  const wrappedCallback = (response) => {
    if (responded) return; // Already handled by timeout
    responded = true;
    clearTimeout(timeoutId);
    callback(response);
  };

  // Set timeout
  timeoutId = setTimeout(() => {
    if (responded) return;
    responded = true;
    console.error(`Socket timeout for event: ${event}`);
    callback({ success: false, error: 'Request timeout - server not responding' });
  }, timeout);

  // Emit with wrapped callback
  if (data && typeof data === 'object') {
    socket.emit(event, data, wrappedCallback);
  } else {
    socket.emit(event, wrappedCallback);
  }
};
