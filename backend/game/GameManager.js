import GameRoom from './GameRoom.js';

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> GameRoom
    this.userRooms = new Map(); // userId -> roomCode
    this.socketUsers = new Map(); // socketId -> userId
    this.startCleanupInterval();
  }

  startCleanupInterval() {
    // Check for inactive rooms every 10 minutes
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 10 * 60 * 1000); // 10 minutes
  }

  cleanupInactiveRooms() {
    const now = Date.now();
    const inactivityTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
    const roomsToDelete = [];

    this.rooms.forEach((room, roomCode) => {
      const timeSinceActivity = now - room.lastActivity;
      
      if (timeSinceActivity > inactivityTimeout) {
        console.log(`🧹 Cleaning up inactive room: ${roomCode} (inactive for ${Math.round(timeSinceActivity / 1000 / 60)} minutes)`);
        
        // Remove all users from this room
        room.players.forEach((player) => {
          this.userRooms.delete(player.userId);
          if (player.socketId) {
            this.socketUsers.delete(player.socketId);
          }
        });
        
        roomsToDelete.push(roomCode);
      }
    });

    // Delete the inactive rooms
    roomsToDelete.forEach(roomCode => {
      const room = this.rooms.get(roomCode);
      if (room) {
        room.cleanup(); // Clear timers before deletion
      }
      this.rooms.delete(roomCode);
    });

    if (roomsToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${roomsToDelete.length} inactive room(s)`);
    }
  }

  deleteAllRooms() {
    const roomCount = this.rooms.size;
    
    // Clear all users from rooms
    this.rooms.forEach((room) => {
      room.players.forEach((player) => {
        this.userRooms.delete(player.userId);
        if (player.socketId) {
          this.socketUsers.delete(player.socketId);
        }
      });
    });

    // Clear all maps
    this.rooms.clear();
    this.userRooms.clear();
    this.socketUsers.clear();

    console.log(`🗑️  Deleted all ${roomCount} room(s)`);
    return { deleted: roomCount };
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId, settings) {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(roomCode, hostId, settings);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  joinRoom(roomCode, userId, username, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    // Remove user from previous room if exists
    const previousRoom = this.userRooms.get(userId);
    if (previousRoom && previousRoom !== roomCode) {
      this.leaveRoom(userId);
    }

    // Check if player is already in this room
    if (room.players.has(userId)) {
      // Just update socket ID (reconnection case)
      const player = room.players.get(userId);
      player.socketId = socketId;
      this.socketUsers.set(socketId, userId);
    } else {
      // Add new player
      room.addPlayer(userId, username, socketId);
      this.userRooms.set(userId, roomCode);
      this.socketUsers.set(socketId, userId);
    }

    return room;
  }

  leaveRoom(userId) {
    const roomCode = this.userRooms.get(userId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.removePlayer(userId);
    this.userRooms.delete(userId);

    // Delete room if empty
    if (room.players.size === 0) {
      room.cleanup(); // Clear timers before deletion
      this.rooms.delete(roomCode);
      return { roomDeleted: true };
    }

    return room;
  }

  handleDisconnect(socketId) {
    const userId = this.socketUsers.get(socketId);
    if (!userId) return null;

    this.socketUsers.delete(socketId);
    
    const roomCode = this.userRooms.get(userId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // Update socket ID to null (player still in room but disconnected)
    const player = room.players.get(userId);
    if (player) {
      player.socketId = null;
    }

    return { roomCode, userId };
  }

  reconnectPlayer(userId, socketId) {
    const roomCode = this.userRooms.get(userId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(userId);
    if (player) {
      player.socketId = socketId;
      this.socketUsers.set(socketId, userId);
    }

    return room;
  }

  getRoomByUserId(userId) {
    const roomCode = this.userRooms.get(userId);
    return roomCode ? this.rooms.get(roomCode) : null;
  }

  getUserIdBySocket(socketId) {
    return this.socketUsers.get(socketId);
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      roomCode: room.roomCode,
      playerCount: room.players.size,
      status: room.status,
      settings: room.settings
    }));
  }
}

export default new GameManager();
