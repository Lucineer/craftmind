/**
 * @module craftmind/social/friends
 * @description FriendsSystem - Player friend management system.
 *
 * Handles friend requests, friend lists, and online status tracking.
 * Supports sendRequest, acceptRequest, removeFriend, and status queries.
 *
 * @example
 * const friends = new FriendsSystem('./data/friends');
 * friends.sendRequest('player-uuid-1', 'player-uuid-2');
 * friends.acceptRequest('player-uuid-2', 'player-uuid-1');
 * const online = friends.getOnlineFriends('player-uuid-1');
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} FriendEntry
 * @property {string} uuid - Friend's UUID
 * @property {string} displayName - Friend's display name
 * @property {string} addedAt - ISO timestamp when friendship started
 * @property {string} lastSeen - ISO timestamp of last online
 * @property {boolean} online - Whether friend is currently online
 */

/**
 * @typedef {Object} FriendRequest
 * @property {string} from - Sender UUID
 * @property {string} fromName - Sender display name
 * @property {string} to - Target UUID
 * @property {string} toName - Target display name
 * @property {string} sentAt - ISO timestamp
 * @property {string} status - "pending", "accepted", "declined"
 */

/**
 * @typedef {Object} PlayerFriendData
 * @property {string} uuid - Player UUID
 * @property {string} displayName - Display name
 * @property {FriendEntry[]} friends - Friend list
 * @property {FriendRequest[]} pendingRequests - Incoming requests
 * @property {FriendRequest[]} sentRequests - Outgoing requests
 */

/** @constant {number} Maximum friends per player */
const MAX_FRIENDS = 50;

/** @constant {number} Maximum pending requests */
const MAX_PENDING_REQUESTS = 20;

/** @constant {number} Request expiration in days */
const REQUEST_EXPIRATION_DAYS = 7;

/**
 * FriendsSystem class - manages player friendships.
 */
class FriendsSystem {
  /**
   * Create a new FriendsSystem.
   * @param {string} [dataDir='./data/friends'] - Directory for friend data
   */
  constructor(dataDir = './data/friends') {
    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {Map<string, PlayerFriendData>} Player friend data by UUID */
    this.playerData = new Map();

    /** @type {Map<string, Set<string>>} Online status cache */
    this.onlineStatus = new Map();

    /** @type {Map<string, string>} UUID to display name cache */
    this.nameCache = new Map();

    /** @type {Function} Optional callback when a friend comes online */
    this.onFriendOnline = null;

    /** @type {Function} Optional callback when a friend goes offline */
    this.onFriendOffline = null;
  }

  /**
   * Get file path for player's friend data.
   * @private
   * @param {string} playerUuid
   * @returns {string}
   */
  _getFilePath(playerUuid) {
    return path.join(this.dataDir, `${playerUuid}.json`);
  }

  /**
   * Load player's friend data.
   * @private
   * @param {string} playerUuid
   * @returns {PlayerFriendData}
   */
  _loadPlayer(playerUuid) {
    if (this.playerData.has(playerUuid)) {
      return this.playerData.get(playerUuid);
    }

    const filePath = this._getFilePath(playerUuid);

    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.playerData.set(playerUuid, data);

        // Update name cache
        if (data.displayName) {
          this.nameCache.set(playerUuid, data.displayName);
        }

        return data;
      }
    } catch (err) {
      console.warn(`[FriendsSystem] Failed to load ${playerUuid}: ${err.message}`);
    }

    // Create new player data
    const newData = {
      uuid: playerUuid,
      displayName: '',
      friends: [],
      pendingRequests: [],
      sentRequests: [],
    };

    this.playerData.set(playerUuid, newData);
    return newData;
  }

  /**
   * Save player's friend data.
   * @private
   * @param {string} playerUuid
   */
  _savePlayer(playerUuid) {
    const data = this.playerData.get(playerUuid);
    if (!data) return;

    const filePath = this._getFilePath(playerUuid);

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn(`[FriendsSystem] Failed to save ${playerUuid}: ${err.message}`);
    }
  }

  /**
   * Update player's display name.
   * @param {string} playerUuid
   * @param {string} displayName
   */
  updatePlayerName(playerUuid, displayName) {
    const data = this._loadPlayer(playerUuid);
    data.displayName = displayName;
    this.nameCache.set(playerUuid, displayName);
    this._savePlayer(playerUuid);
  }

  /**
   * Set player online status.
   * @param {string} playerUuid
   * @param {boolean} online
   * @param {string} [displayName]
   */
  setOnlineStatus(playerUuid, online, displayName = '') {
    const wasOnline = this.onlineStatus.get(playerUuid) || false;
    this.onlineStatus.set(playerUuid, online);

    if (displayName) {
      this.updatePlayerName(playerUuid, displayName);
    }

    // Update last seen
    const data = this._loadPlayer(playerUuid);
    if (!online && wasOnline) {
      data.lastSeen = new Date().toISOString();
      this._savePlayer(playerUuid);
    }

    // Notify friends of status change
    if (online !== wasOnline) {
      this._notifyFriendsOfStatusChange(playerUuid, online);
    }
  }

  /**
   * Notify friends of a player's status change.
   * @private
   * @param {string} playerUuid
   * @param {boolean} online
   */
  _notifyFriendsOfStatusChange(playerUuid, online) {
    const data = this._loadPlayer(playerUuid);
    const playerName = data.displayName || playerUuid;

    for (const friend of data.friends) {
      if (online && this.onFriendOnline) {
        this.onFriendOnline(friend.uuid, playerUuid, playerName);
      } else if (!online && this.onFriendOffline) {
        this.onFriendOffline(friend.uuid, playerUuid, playerName);
      }
    }
  }

  /**
   * Send a friend request.
   * @param {string} fromUuid - Sender UUID
   * @param {string} toUuid - Target UUID
   * @param {string} [fromName] - Sender display name
   * @param {string} [toName] - Target display name
   * @returns {Object} { success: boolean, message: string }
   */
  sendRequest(fromUuid, toUuid, fromName = '', toName = '') {
    // Can't friend yourself
    if (fromUuid === toUuid) {
      return { success: false, message: 'Cannot send friend request to yourself' };
    }

    const fromData = this._loadPlayer(fromUuid);
    const toData = this._loadPlayer(toUuid);

    // Update names if provided
    if (fromName) {
      fromData.displayName = fromName;
      this.nameCache.set(fromUuid, fromName);
    }
    if (toName) {
      toData.displayName = toName;
      this.nameCache.set(toUuid, toName);
    }

    // Check if already friends
    if (fromData.friends.some(f => f.uuid === toUuid)) {
      return { success: false, message: 'Already friends with this player' };
    }

    // Check for existing pending request
    if (toData.pendingRequests.some(r => r.from === fromUuid && r.status === 'pending')) {
      return { success: false, message: 'Friend request already sent' };
    }

    // Check for existing incoming request (auto-accept)
    const existingIncoming = fromData.pendingRequests.find(
      r => r.from === toUuid && r.status === 'pending'
    );
    if (existingIncoming) {
      return this.acceptRequest(fromUuid, toUuid);
    }

    // Check limits
    if (toData.pendingRequests.length >= MAX_PENDING_REQUESTS) {
      return { success: false, message: 'Target player has too many pending requests' };
    }

    if (fromData.friends.length >= MAX_FRIENDS) {
      return { success: false, message: 'You have reached the maximum number of friends' };
    }

    // Create request
    const request = {
      from: fromUuid,
      fromName: fromName || fromData.displayName || 'Unknown',
      to: toUuid,
      toName: toName || toData.displayName || 'Unknown',
      sentAt: new Date().toISOString(),
      status: 'pending',
    };

    // Add to both players' data
    toData.pendingRequests.push(request);
    fromData.sentRequests.push(request);

    this._savePlayer(fromUuid);
    this._savePlayer(toUuid);

    return { success: true, message: 'Friend request sent' };
  }

  /**
   * Accept a friend request.
   * @param {string} toUuid - Player accepting the request
   * @param {string} fromUuid - Player who sent the request
   * @returns {Object} { success: boolean, message: string }
   */
  acceptRequest(toUuid, fromUuid) {
    const toData = this._loadPlayer(toUuid);
    const fromData = this._loadPlayer(fromUuid);

    // Find the request
    const request = toData.pendingRequests.find(
      r => r.from === fromUuid && r.status === 'pending'
    );

    if (!request) {
      return { success: false, message: 'No pending friend request from this player' };
    }

    // Check limits
    if (toData.friends.length >= MAX_FRIENDS || fromData.friends.length >= MAX_FRIENDS) {
      return { success: false, message: 'One of you has reached the friend limit' };
    }

    // Update request status
    request.status = 'accepted';
    request.acceptedAt = new Date().toISOString();

    // Remove from sent requests
    const sentRequest = fromData.sentRequests.find(
      r => r.to === toUuid && r.from === fromUuid
    );
    if (sentRequest) {
      sentRequest.status = 'accepted';
      sentRequest.acceptedAt = request.acceptedAt;
    }

    // Add to friends list
    const now = new Date().toISOString();

    toData.friends.push({
      uuid: fromUuid,
      displayName: fromData.displayName || request.fromName,
      addedAt: now,
      lastSeen: now,
      online: this.onlineStatus.get(fromUuid) || false,
    });

    fromData.friends.push({
      uuid: toUuid,
      displayName: toData.displayName || request.toName,
      addedAt: now,
      lastSeen: now,
      online: this.onlineStatus.get(toUuid) || false,
    });

    // Remove from pending
    toData.pendingRequests = toData.pendingRequests.filter(
      r => !(r.from === fromUuid && r.status === 'accepted')
    );

    this._savePlayer(toUuid);
    this._savePlayer(fromUuid);

    return { success: true, message: `You are now friends with ${fromData.displayName || fromUuid}` };
  }

  /**
   * Decline a friend request.
   * @param {string} toUuid - Player declining the request
   * @param {string} fromUuid - Player who sent the request
   * @returns {Object} { success: boolean, message: string }
   */
  declineRequest(toUuid, fromUuid) {
    const toData = this._loadPlayer(toUuid);
    const fromData = this._loadPlayer(fromUuid);

    // Find and update the request
    const request = toData.pendingRequests.find(
      r => r.from === fromUuid && r.status === 'pending'
    );

    if (!request) {
      return { success: false, message: 'No pending friend request from this player' };
    }

    request.status = 'declined';
    request.declinedAt = new Date().toISOString();

    // Update sent request
    const sentRequest = fromData.sentRequests.find(
      r => r.to === toUuid && r.from === fromUuid
    );
    if (sentRequest) {
      sentRequest.status = 'declined';
      sentRequest.declinedAt = request.declinedAt;
    }

    // Remove from pending
    toData.pendingRequests = toData.pendingRequests.filter(
      r => !(r.from === fromUuid && r.status === 'declined')
    );

    this._savePlayer(toUuid);
    this._savePlayer(fromUuid);

    return { success: true, message: 'Friend request declined' };
  }

  /**
   * Remove a friend.
   * @param {string} playerUuid
   * @param {string} friendUuid
   * @returns {Object} { success: boolean, message: string }
   */
  removeFriend(playerUuid, friendUuid) {
    const playerData = this._loadPlayer(playerUuid);
    const friendData = this._loadPlayer(friendUuid);

    // Check if friends
    const friendIndex = playerData.friends.findIndex(f => f.uuid === friendUuid);
    if (friendIndex === -1) {
      return { success: false, message: 'Not friends with this player' };
    }

    // Remove from both lists
    playerData.friends.splice(friendIndex, 1);
    friendData.friends = friendData.friends.filter(f => f.uuid !== playerUuid);

    this._savePlayer(playerUuid);
    this._savePlayer(friendUuid);

    return { success: true, message: 'Friend removed' };
  }

  /**
   * Get all friends for a player.
   * @param {string} playerUuid
   * @returns {FriendEntry[]}
   */
  getAllFriends(playerUuid) {
    const data = this._loadPlayer(playerUuid);

    // Update online status
    for (const friend of data.friends) {
      friend.online = this.onlineStatus.get(friend.uuid) || false;
    }

    return data.friends;
  }

  /**
   * Get online friends for a player.
   * @param {string} playerUuid
   * @returns {FriendEntry[]}
   */
  getOnlineFriends(playerUuid) {
    return this.getAllFriends(playerUuid).filter(f => f.online);
  }

  /**
   * Get pending friend requests for a player.
   * @param {string} playerUuid
   * @returns {FriendRequest[]}
   */
  getPendingRequests(playerUuid) {
    const data = this._loadPlayer(playerUuid);

    // Filter out expired requests
    const now = Date.now();
    const cutoff = now - REQUEST_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    data.pendingRequests = data.pendingRequests.filter(r => {
      if (r.status !== 'pending') return false;
      return new Date(r.sentAt).getTime() > cutoff;
    });

    this._savePlayer(playerUuid);
    return data.pendingRequests;
  }

  /**
   * Get sent friend requests for a player.
   * @param {string} playerUuid
   * @returns {FriendRequest[]}
   */
  getSentRequests(playerUuid) {
    const data = this._loadPlayer(playerUuid);
    return data.sentRequests.filter(r => r.status === 'pending');
  }

  /**
   * Check if two players are friends.
   * @param {string} playerUuid1
   * @param {string} playerUuid2
   * @returns {boolean}
   */
  areFriends(playerUuid1, playerUuid2) {
    const data = this._loadPlayer(playerUuid1);
    return data.friends.some(f => f.uuid === playerUuid2);
  }

  /**
   * Get friend count for a player.
   * @param {string} playerUuid
   * @returns {number}
   */
  getFriendCount(playerUuid) {
    const data = this._loadPlayer(playerUuid);
    return data.friends.length;
  }

  /**
   * Get a friend's info.
   * @param {string} playerUuid
   * @param {string} friendUuid
   * @returns {FriendEntry|null}
   */
  getFriendInfo(playerUuid, friendUuid) {
    const data = this._loadPlayer(playerUuid);
    return data.friends.find(f => f.uuid === friendUuid) || null;
  }

  /**
   * Get friends system status.
   * @returns {Object}
   */
  getStatus() {
    return {
      cachedPlayers: this.playerData.size,
      onlinePlayers: Array.from(this.onlineStatus.values()).filter(v => v).length,
      nameCacheSize: this.nameCache.size,
    };
  }

  /**
   * Clear expired requests for all players.
   */
  clearExpiredRequests() {
    const now = Date.now();
    const cutoff = now - REQUEST_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    for (const [uuid, data] of this.playerData) {
      const before = data.pendingRequests.length;

      data.pendingRequests = data.pendingRequests.filter(r => {
        if (r.status !== 'pending') return false;
        return new Date(r.sentAt).getTime() > cutoff;
      });

      if (data.pendingRequests.length !== before) {
        this._savePlayer(uuid);
      }
    }
  }
}

module.exports = {
  FriendsSystem,
  MAX_FRIENDS,
  MAX_PENDING_REQUESTS,
  REQUEST_EXPIRATION_DAYS,
};
