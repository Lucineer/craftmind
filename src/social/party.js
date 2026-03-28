/**
 * @module craftmind/social/party
 * @description PartySystem - Player party/group management.
 *
 * Handles party creation, invites, and management.
 * Supports up to 4 players per party with shared chat,
 * proximity indicators, and party bonuses (+10% XP when fishing together).
 *
 * @example
 * const parties = new PartySystem();
 * const party = parties.createParty('leader-uuid');
 * parties.invite('leader-uuid', 'target-uuid');
 * parties.join(party.id, 'target-uuid');
 * parties.sendPartyMessage(party.id, 'leader-uuid', 'Hello team!');
 */

/**
 * @typedef {Object} PartyMember
 * @property {string} uuid - Player UUID
 * @property {string} displayName - Display name
 * @property {boolean} isLeader - Whether this member is the leader
 * @property {string} joinedAt - ISO timestamp
 * @property {Object} position - Current position { x, y, z }
 * @property {number} distance - Distance from leader
 */

/**
 * @typedef {Object} Party
 * @property {string} id - Unique party ID
 * @property {string} leaderUuid - Leader's UUID
 * @property {PartyMember[]} members - Party members
 * @property {string} createdAt - ISO timestamp
 * @property {boolean} active - Whether party is active
 * @property {string[]} chatHistory - Recent chat messages
 * @property {Object} settings - Party settings
 * @property {boolean} settings.sharedLoot - Share loot among members
 * @property {boolean} settings.openInvite - Allow members to invite
 */

/** @constant {number} Maximum party size */
const MAX_PARTY_SIZE = 4;

/** @constant {number} Maximum chat history to keep */
const MAX_CHAT_HISTORY = 50;

/** @constant {number} XP bonus for party members */
const PARTY_XP_BONUS = 0.10; // 10%

/** @constant {number} Maximum invite expiration in minutes */
const INVITE_EXPIRATION_MINUTES = 5;

/**
 * Generate a unique party ID.
 * @private
 * @returns {string}
 */
function generatePartyId() {
  return `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * PartySystem class - manages player parties.
 */
class PartySystem {
  /**
   * Create a new PartySystem.
   */
  constructor() {
    /** @type {Map<string, Party>} Active parties by ID */
    this.parties = new Map();

    /** @type {Map<string, string>} Player UUID to party ID mapping */
    this.playerParties = new Map();

    /** @type {Map<string, Object>} Pending invites by key */
    this.pendingInvites = new Map();

    /** @type {Function} Callback when party is created */
    this.onPartyCreated = null;

    /** @type {Function} Callback when member joins */
    this.onMemberJoin = null;

    /** @type {Function} Callback when member leaves */
    this.onMemberLeave = null;

    /** @type {Function} Callback when party chat message sent */
    this.onPartyChat = null;
  }

  /**
   * Create a new party.
   * @param {string} leaderUuid - Leader's UUID
   * @param {string} [leaderName=''] - Leader's display name
   * @returns {Party}
   */
  createParty(leaderUuid, leaderName = '') {
    // Check if player is already in a party
    if (this.playerParties.has(leaderUuid)) {
      const existingId = this.playerParties.get(leaderUuid);
      return this.parties.get(existingId);
    }

    const partyId = generatePartyId();
    const now = new Date().toISOString();

    /** @type {Party} */
    const party = {
      id: partyId,
      leaderUuid,
      members: [{
        uuid: leaderUuid,
        displayName: leaderName,
        isLeader: true,
        joinedAt: now,
        position: null,
        distance: 0,
      }],
      createdAt: now,
      active: true,
      chatHistory: [],
      settings: {
        sharedLoot: false,
        openInvite: true, // Members can invite others
      },
    };

    this.parties.set(partyId, party);
    this.playerParties.set(leaderUuid, partyId);

    if (this.onPartyCreated) {
      this.onPartyCreated(party);
    }

    return party;
  }

  /**
   * Invite a player to a party.
   * @param {string} inviterUuid - Inviter's UUID
   * @param {string} targetUuid - Target's UUID
   * @param {string} [inviterName=''] - Inviter's display name
   * @param {string} [targetName=''] - Target's display name
   * @returns {Object} { success: boolean, message: string, inviteKey?: string }
   */
  invite(inviterUuid, targetUuid, inviterName = '', targetName = '') {
    // Check if inviter is in a party
    const partyId = this.playerParties.get(inviterUuid);
    if (!partyId) {
      return { success: false, message: 'You are not in a party' };
    }

    const party = this.parties.get(partyId);

    // Check if party is full
    if (party.members.length >= MAX_PARTY_SIZE) {
      return { success: false, message: 'Party is full' };
    }

    // Check if target is already in a party
    if (this.playerParties.has(targetUuid)) {
      return { success: false, message: 'Player is already in a party' };
    }

    // Check invite permissions
    const inviterMember = party.members.find(m => m.uuid === inviterUuid);
    if (!inviterMember) {
      return { success: false, message: 'You are not in this party' };
    }

    if (!inviterMember.isLeader && !party.settings.openInvite) {
      return { success: false, message: 'Only the leader can invite' };
    }

    // Check for existing invite
    const inviteKey = `${partyId}:${targetUuid}`;
    if (this.pendingInvites.has(inviteKey)) {
      const existing = this.pendingInvites.get(inviteKey);
      if (Date.now() - existing.sentAt < INVITE_EXPIRATION_MINUTES * 60 * 1000) {
        return { success: false, message: 'Player already has a pending invite' };
      }
    }

    // Create invite
    const invite = {
      partyId,
      inviterUuid,
      inviterName,
      targetUuid,
      targetName,
      sentAt: Date.now(),
      expiresAt: Date.now() + INVITE_EXPIRATION_MINUTES * 60 * 1000,
    };

    this.pendingInvites.set(inviteKey, invite);

    return {
      success: true,
      message: `Invited ${targetName || targetUuid} to party`,
      inviteKey,
      partyId,
    };
  }

  /**
   * Accept a party invite.
   * @param {string} targetUuid - Target's UUID
   * @param {string} partyId - Party ID to join
   * @param {string} [targetName=''] - Target's display name
   * @returns {Object} { success: boolean, message: string, party?: Party }
   */
  acceptInvite(targetUuid, partyId, targetName = '') {
    const inviteKey = `${partyId}:${targetUuid}`;
    const invite = this.pendingInvites.get(inviteKey);

    if (!invite) {
      return { success: false, message: 'No pending invite for this party' };
    }

    // Check expiration
    if (Date.now() > invite.expiresAt) {
      this.pendingInvites.delete(inviteKey);
      return { success: false, message: 'Invite has expired' };
    }

    // Join the party
    const result = this._joinParty(partyId, targetUuid, targetName);

    if (result.success) {
      this.pendingInvites.delete(inviteKey);
    }

    return result;
  }

  /**
   * Decline a party invite.
   * @param {string} targetUuid - Target's UUID
   * @param {string} partyId - Party ID
   * @returns {Object} { success: boolean, message: string }
   */
  declineInvite(targetUuid, partyId) {
    const inviteKey = `${partyId}:${targetUuid}`;

    if (!this.pendingInvites.has(inviteKey)) {
      return { success: false, message: 'No pending invite' };
    }

    this.pendingInvites.delete(inviteKey);
    return { success: true, message: 'Invite declined' };
  }

  /**
   * Join a party directly (with invite key).
   * @param {string} partyId - Party ID
   * @param {string} playerUuid - Player UUID
   * @param {string} [playerName=''] - Player display name
   * @returns {Object} { success: boolean, message: string, party?: Party }
   */
  join(partyId, playerUuid, playerName = '') {
    return this._joinParty(partyId, playerUuid, playerName);
  }

  /**
   * Internal method to add a player to a party.
   * @private
   * @param {string} partyId
   * @param {string} playerUuid
   * @param {string} playerName
   * @returns {Object}
   */
  _joinParty(partyId, playerUuid, playerName) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    if (!party.active) {
      return { success: false, message: 'Party is no longer active' };
    }

    // Check if player is already in a party
    if (this.playerParties.has(playerUuid)) {
      const existingPartyId = this.playerParties.get(playerUuid);
      if (existingPartyId !== partyId) {
        return { success: false, message: 'You are already in another party' };
      }
      return { success: true, message: 'Already in this party', party };
    }

    // Check party size
    if (party.members.length >= MAX_PARTY_SIZE) {
      return { success: false, message: 'Party is full' };
    }

    // Add member
    const member = {
      uuid: playerUuid,
      displayName: playerName,
      isLeader: false,
      joinedAt: new Date().toISOString(),
      position: null,
      distance: 0,
    };

    party.members.push(member);
    this.playerParties.set(playerUuid, partyId);

    // Send join notification to party
    this._sendSystemMessage(partyId, `${playerName || playerUuid} joined the party`);

    if (this.onMemberJoin) {
      this.onMemberJoin(party, member);
    }

    return { success: true, message: 'Joined party', party };
  }

  /**
   * Leave a party.
   * @param {string} partyId - Party ID
   * @param {string} playerUuid - Player UUID
   * @returns {Object} { success: boolean, message: string }
   */
  leave(partyId, playerUuid) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    const memberIndex = party.members.findIndex(m => m.uuid === playerUuid);
    if (memberIndex === -1) {
      return { success: false, message: 'You are not in this party' };
    }

    const member = party.members[memberIndex];
    const wasLeader = member.isLeader;

    // Remove member
    party.members.splice(memberIndex, 1);
    this.playerParties.delete(playerUuid);

    // Send leave notification
    this._sendSystemMessage(partyId, `${member.displayName || playerUuid} left the party`);

    if (this.onMemberLeave) {
      this.onMemberLeave(party, member);
    }

    // Handle leader leaving
    if (wasLeader && party.members.length > 0) {
      // Promote next member to leader
      party.members[0].isLeader = true;
      party.leaderUuid = party.members[0].uuid;
      this._sendSystemMessage(partyId, `${party.members[0].displayName || party.members[0].uuid} is now the leader`);
    }

    // Disband if empty
    if (party.members.length === 0) {
      party.active = false;
      this.parties.delete(partyId);
      return { success: true, message: 'Party disbanded' };
    }

    return { success: true, message: 'Left party' };
  }

  /**
   * Kick a member from the party.
   * @param {string} partyId - Party ID
   * @param {string} leaderUuid - Leader's UUID
   * @param {string} targetUuid - Target's UUID
   * @returns {Object} { success: boolean, message: string }
   */
  kickMember(partyId, leaderUuid, targetUuid) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    // Check if leader
    const leader = party.members.find(m => m.uuid === leaderUuid);
    if (!leader || !leader.isLeader) {
      return { success: false, message: 'Only the leader can kick members' };
    }

    // Can't kick yourself
    if (leaderUuid === targetUuid) {
      return { success: false, message: 'Cannot kick yourself' };
    }

    const memberIndex = party.members.findIndex(m => m.uuid === targetUuid);
    if (memberIndex === -1) {
      return { success: false, message: 'Player is not in this party' };
    }

    const member = party.members[memberIndex];

    // Remove member
    party.members.splice(memberIndex, 1);
    this.playerParties.delete(targetUuid);

    this._sendSystemMessage(partyId, `${member.displayName || targetUuid} was kicked from the party`);

    if (this.onMemberLeave) {
      this.onMemberLeave(party, member);
    }

    return { success: true, message: `Kicked ${member.displayName || targetUuid}` };
  }

  /**
   * Transfer leadership to another member.
   * @param {string} partyId - Party ID
   * @param {string} leaderUuid - Current leader's UUID
   * @param {string} targetUuid - New leader's UUID
   * @returns {Object} { success: boolean, message: string }
   */
  transferLeadership(partyId, leaderUuid, targetUuid) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    // Check if leader
    const currentLeader = party.members.find(m => m.uuid === leaderUuid);
    if (!currentLeader || !currentLeader.isLeader) {
      return { success: false, message: 'Only the leader can transfer leadership' };
    }

    // Find target
    const newLeader = party.members.find(m => m.uuid === targetUuid);
    if (!newLeader) {
      return { success: false, message: 'Player is not in this party' };
    }

    // Update leadership
    currentLeader.isLeader = false;
    newLeader.isLeader = true;
    party.leaderUuid = targetUuid;

    this._sendSystemMessage(partyId, `${newLeader.displayName || targetUuid} is now the party leader`);

    return { success: true, message: 'Leadership transferred' };
  }

  /**
   * Send a party chat message.
   * @param {string} partyId - Party ID
   * @param {string} senderUuid - Sender's UUID
   * @param {string} message - Message content
   * @returns {Object} { success: boolean, message: string }
   */
  sendPartyMessage(partyId, senderUuid, message) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    const sender = party.members.find(m => m.uuid === senderUuid);
    if (!sender) {
      return { success: false, message: 'You are not in this party' };
    }

    const chatEntry = {
      sender: sender.displayName || senderUuid,
      senderUuid,
      message,
      timestamp: new Date().toISOString(),
    };

    party.chatHistory.push(chatEntry);

    // Trim history
    if (party.chatHistory.length > MAX_CHAT_HISTORY) {
      party.chatHistory.shift();
    }

    if (this.onPartyChat) {
      this.onPartyChat(party, chatEntry);
    }

    return { success: true, chatEntry };
  }

  /**
   * Send a system message to the party.
   * @private
   * @param {string} partyId
   * @param {string} message
   */
  _sendSystemMessage(partyId, message) {
    const party = this.parties.get(partyId);
    if (!party) return;

    const chatEntry = {
      sender: 'System',
      senderUuid: 'system',
      message,
      timestamp: new Date().toISOString(),
      system: true,
    };

    party.chatHistory.push(chatEntry);

    if (party.chatHistory.length > MAX_CHAT_HISTORY) {
      party.chatHistory.shift();
    }
  }

  /**
   * Update member position.
   * @param {string} playerUuid - Player UUID
   * @param {Object} position - Position { x, y, z }
   */
  updateMemberPosition(playerUuid, position) {
    const partyId = this.playerParties.get(playerUuid);
    if (!partyId) return;

    const party = this.parties.get(partyId);
    if (!party) return;

    const member = party.members.find(m => m.uuid === playerUuid);
    if (!member) return;

    member.position = position;

    // Calculate distance from leader
    const leader = party.members.find(m => m.isLeader);
    if (leader && leader.position && position) {
      const dx = position.x - leader.position.x;
      const dy = position.y - leader.position.y;
      const dz = position.z - leader.position.z;
      member.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }

  /**
   * Get proximity indicators for all members.
   * @param {string} partyId
   * @returns {Object[]} Array of { uuid, displayName, distance, proximity }
   */
  getProximityIndicators(partyId) {
    const party = this.parties.get(partyId);
    if (!party) return [];

    const leader = party.members.find(m => m.isLeader);

    return party.members.map(m => {
      let proximity = 'unknown';

      if (m.distance !== undefined) {
        if (m.distance < 30) proximity = 'near';
        else if (m.distance < 100) proximity = 'far';
        else proximity = 'distant';
      }

      return {
        uuid: m.uuid,
        displayName: m.displayName,
        distance: m.distance,
        proximity,
        isLeader: m.isLeader,
      };
    });
  }

  /**
   * Get party for a player.
   * @param {string} playerUuid
   * @returns {Party|null}
   */
  getPlayerParty(playerUuid) {
    const partyId = this.playerParties.get(playerUuid);
    if (!partyId) return null;
    return this.parties.get(partyId) || null;
  }

  /**
   * Get party by ID.
   * @param {string} partyId
   * @returns {Party|null}
   */
  getParty(partyId) {
    return this.parties.get(partyId) || null;
  }

  /**
   * Calculate XP bonus for party members.
   * @param {string} playerUuid
   * @returns {number} XP multiplier (1.0 for solo, 1.1 for party)
   */
  getXpBonus(playerUuid) {
    const party = this.getPlayerParty(playerUuid);
    if (!party || party.members.length < 2) {
      return 1.0;
    }

    // Check if at least one other member is nearby (< 50 blocks)
    const member = party.members.find(m => m.uuid === playerUuid);
    if (!member) return 1.0;

    const nearbyMembers = party.members.filter(m =>
      m.uuid !== playerUuid && m.distance !== undefined && m.distance < 50
    );

    if (nearbyMembers.length === 0) {
      return 1.0;
    }

    return 1.0 + PARTY_XP_BONUS;
  }

  /**
   * Get party status summary.
   * @param {string} partyId
   * @returns {Object|null}
   */
  getPartyStatus(partyId) {
    const party = this.parties.get(partyId);
    if (!party) return null;

    return {
      id: party.id,
      leader: party.members.find(m => m.isLeader)?.displayName || 'Unknown',
      memberCount: party.members.length,
      maxMembers: MAX_PARTY_SIZE,
      active: party.active,
      createdAt: party.createdAt,
      proximity: this.getProximityIndicators(partyId),
    };
  }

  /**
   * Disband a party.
   * @param {string} partyId
   * @param {string} leaderUuid
   * @returns {Object} { success: boolean, message: string }
   */
  disband(partyId, leaderUuid) {
    const party = this.parties.get(partyId);

    if (!party) {
      return { success: false, message: 'Party not found' };
    }

    const leader = party.members.find(m => m.uuid === leaderUuid);
    if (!leader || !leader.isLeader) {
      return { success: false, message: 'Only the leader can disband the party' };
    }

    // Remove all members
    for (const member of party.members) {
      this.playerParties.delete(member.uuid);
    }

    this._sendSystemMessage(partyId, 'Party has been disbanded');

    party.active = false;
    party.members = [];
    this.parties.delete(partyId);

    return { success: true, message: 'Party disbanded' };
  }

  /**
   * Get system status.
   * @returns {Object}
   */
  getStatus() {
    return {
      activeParties: this.parties.size,
      playersInParties: this.playerParties.size,
      pendingInvites: this.pendingInvites.size,
    };
  }

  /**
   * Clean up expired invites.
   */
  clearExpiredInvites() {
    const now = Date.now();

    for (const [key, invite] of this.pendingInvites) {
      if (now > invite.expiresAt) {
        this.pendingInvites.delete(key);
      }
    }
  }
}

module.exports = {
  PartySystem,
  MAX_PARTY_SIZE,
  MAX_CHAT_HISTORY,
  PARTY_XP_BONUS,
  INVITE_EXPIRATION_MINUTES,
};
