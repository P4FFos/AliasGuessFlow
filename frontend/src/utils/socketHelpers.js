/**
 * Socket utility functions for better error handling and timeouts
 */

/**
 * Emit a socket event with automatic timeout handling
 * @param {Socket} socket - Socket.io socket instance
 * @param {string} event - Event name
 * @param {object} data - Data to send
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise} Promise that resolves with response or rejects on timeout/error
 */
export const emitWithTimeout = (socket, event, data = {}, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    let timeoutId;
    let completed = false;

    const cleanup = () => {
      completed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (!completed) {
        cleanup();
        reject(new Error(`Socket request timed out after ${timeout}ms`));
      }
    }, timeout);

    // Emit with callback
    socket.emit(event, data, (response) => {
      if (completed) return; // Ignore late responses
      cleanup();
      
      if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
};

/**
 * Retry a socket emission with exponential backoff
 * @param {Socket} socket - Socket.io socket instance
 * @param {string} event - Event name
 * @param {object} data - Data to send
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Promise that resolves with response or rejects after all retries fail
 */
export const emitWithRetry = async (socket, event, data = {}, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await emitWithTimeout(socket, event, data);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Socket emit attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Safely remove all event listeners for a given event
 * @param {Socket} socket - Socket.io socket instance
 * @param {string|Array} events - Event name or array of event names
 */
export const safelyRemoveListeners = (socket, events) => {
  if (!socket) return;
  
  const eventArray = Array.isArray(events) ? events : [events];
  
  eventArray.forEach(event => {
    if (socket.hasListeners && socket.hasListeners(event)) {
      socket.off(event);
    }
  });
};

/**
 * Check if socket is in a healthy state
 * @param {Socket} socket - Socket.io socket instance
 * @returns {boolean} True if socket is connected and healthy
 */
export const isSocketHealthy = (socket) => {
  return socket && socket.connected && !socket.disconnected;
};
