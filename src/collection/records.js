/**
 * Record Tracker - Personal and server-wide fishing records
 *
 * Tracks:
 * - Per-species: largest, smallest, first caught date, total caught
 * - Server-wide records: biggest catches per species
 */

const fs = require('fs');
const path = require('path');

// Server records file
const SERVER_RECORDS_FILE = 'server_records.json';

class RecordTracker {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data/collections');
    this.recordsDir = path.join(this.dataDir, 'records');

    // Ensure directories exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.recordsDir)) {
      fs.mkdirSync(this.recordsDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a player's records
   * @param {string} playerUuid - Player UUID
   * @returns {string} File path
   */
  getPlayerFilePath(playerUuid) {
    return path.join(this.recordsDir, `${playerUuid}_records.json`);
  }

  /**
   * Get the server records file path
   * @returns {string} File path
   */
  getServerRecordsPath() {
    return path.join(this.dataDir, SERVER_RECORDS_FILE);
  }

  /**
   * Load player record data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Record data
   */
  loadPlayerData(playerUuid) {
    const filePath = this.getPlayerFilePath(playerUuid);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return this.createNewPlayerData(playerUuid);
  }

  /**
   * Save player record data
   * @param {string} playerUuid - Player UUID
   * @param {Object} data - Record data
   */
  savePlayerData(playerUuid, data) {
    const filePath = this.getPlayerFilePath(playerUuid);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load server records
   * @returns {Object} Server records
   */
  loadServerRecords() {
    const filePath = this.getServerRecordsPath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return this.createServerRecords();
  }

  /**
   * Save server records
   * @param {Object} data - Server records
   */
  saveServerRecords(data) {
    const filePath = this.getServerRecordsPath();
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create new player record data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} New record data
   */
  createNewPlayerData(playerUuid) {
    return {
      playerUuid,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      records: {}, // fishId -> { largest, smallest, firstCaught, totalCaught }
      summary: {
        totalSpeciesCaught: 0,
        totalFishCaught: 0,
        biggestCatch: null,
        biggestCatchSize: 0,
        serverRecordsHeld: 0
      }
    };
  }

  /**
   * Create new server records
   * @returns {Object} New server records
   */
  createServerRecords() {
    return {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      records: {}, // fishId -> { size, playerUuid, playerName, timestamp }
      dailyRecords: {} // date -> { biggestFish, mostFish, etc }
    };
  }

  /**
   * Update records for a fish catch
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player name
   * @param {string} fishId - Fish species ID
   * @param {number} size - Fish size in cm
   * @returns {Object} Result with record updates
   */
  updateRecord(playerUuid, playerName, fishId, size) {
    const playerData = this.loadPlayerData(playerUuid);
    const serverData = this.loadServerRecords();

    const result = {
      success: true,
      fishId,
      size,
      personalRecords: {
        isNewRecord: false,
        isLargest: false,
        isSmallest: false,
        isFirst: false
      },
      serverRecord: {
        isNewRecord: false,
        previousHolder: null
      }
    };

    // Initialize fish record if not exists
    if (!playerData.records[fishId]) {
      playerData.records[fishId] = {
        largest: null,
        smallest: null,
        firstCaught: null,
        totalCaught: 0
      };
    }

    const fishRecord = playerData.records[fishId];

    // Check for first catch
    if (fishRecord.firstCaught === null) {
      fishRecord.firstCaught = new Date().toISOString();
      result.personalRecords.isFirst = true;
      result.personalRecords.isNewRecord = true;
      playerData.summary.totalSpeciesCaught++;
    }

    // Check for largest
    if (fishRecord.largest === null || size > fishRecord.largest) {
      fishRecord.largest = size;
      result.personalRecords.isLargest = true;
      result.personalRecords.isNewRecord = true;
    }

    // Check for smallest
    if (fishRecord.smallest === null || size < fishRecord.smallest) {
      fishRecord.smallest = size;
      result.personalRecords.isSmallest = true;
      result.personalRecords.isNewRecord = true;
    }

    // Update total
    fishRecord.totalCaught++;
    playerData.summary.totalFishCaught++;

    // Check for personal biggest catch overall
    if (size > playerData.summary.biggestCatchSize) {
      playerData.summary.biggestCatchSize = size;
      playerData.summary.biggestCatch = fishId;
    }

    // Check server record
    if (!serverData.records[fishId] || size > serverData.records[fishId].size) {
      const previousHolder = serverData.records[fishId]?.playerName || null;

      serverData.records[fishId] = {
        size,
        playerUuid,
        playerName,
        fishId,
        timestamp: new Date().toISOString()
      };

      result.serverRecord.isNewRecord = true;
      result.serverRecord.previousHolder = previousHolder;

      // Update server records held count
      if (previousHolder !== playerName) {
        playerData.summary.serverRecordsHeld++;
      }
    }

    // Save data
    this.savePlayerData(playerUuid, playerData);
    this.saveServerRecords(serverData);

    return result;
  }

  /**
   * Get personal records for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Personal records
   */
  getPersonalRecords(playerUuid) {
    const data = this.loadPlayerData(playerUuid);
    return {
      playerUuid,
      records: data.records,
      summary: data.summary,
      createdAt: data.createdAt
    };
  }

  /**
   * Get personal record for a specific fish
   * @param {string} playerUuid - Player UUID
   * @param {string} fishId - Fish species ID
   * @returns {Object|null} Fish record
   */
  getPersonalRecord(playerUuid, fishId) {
    const data = this.loadPlayerData(playerUuid);
    return data.records[fishId] || null;
  }

  /**
   * Get server-wide records
   * @returns {Object} Server records
   */
  getServerRecords() {
    const data = this.loadServerRecords();
    return {
      records: data.records,
      lastUpdated: data.lastUpdated
    };
  }

  /**
   * Get server record for a specific fish
   * @param {string} fishId - Fish species ID
   * @returns {Object|null} Server record
   */
  getServerRecord(fishId) {
    const data = this.loadServerRecords();
    return data.records[fishId] || null;
  }

  /**
   * Get top server records (biggest catches)
   * @param {number} limit - Number of records to return
   * @returns {Array} Top records
   */
  getTopServerRecords(limit = 10) {
    const data = this.loadServerRecords();
    const records = Object.values(data.records);

    // Sort by size descending
    records.sort((a, b) => b.size - a.size);

    return records.slice(0, limit);
  }

  /**
   * Get records by player (all server records held by a player)
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Records held by player
   */
  getServerRecordsByPlayer(playerUuid) {
    const data = this.loadServerRecords();
    const records = Object.values(data.records)
      .filter(r => r.playerUuid === playerUuid);

    return records;
  }

  /**
   * Get daily record for a specific date
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Object|null} Daily record
   */
  getDailyRecord(date) {
    const data = this.loadServerRecords();
    return data.dailyRecords[date] || null;
  }

  /**
   * Update daily record
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player name
   * @param {Object} stats - Daily stats {fishCaught, biggestFish, etc}
   */
  updateDailyRecord(date, playerUuid, playerName, stats) {
    const data = this.loadServerRecords();

    if (!data.dailyRecords[date]) {
      data.dailyRecords[date] = {
        date,
        mostFish: { playerUuid: null, playerName: null, count: 0 },
        biggestFish: { playerUuid: null, playerName: null, fishId: null, size: 0 },
        rarestCatch: { playerUuid: null, playerName: null, fishId: null, rarity: null },
        totalServerCatches: 0
      };
    }

    const daily = data.dailyRecords[date];

    // Update most fish
    if (stats.fishCaught > daily.mostFish.count) {
      daily.mostFish = { playerUuid, playerName, count: stats.fishCaught };
    }

    // Update biggest fish
    if (stats.biggestFish && stats.biggestSize > daily.biggestFish.size) {
      daily.biggestFish = {
        playerUuid, playerName,
        fishId: stats.biggestFish,
        size: stats.biggestSize
      };
    }

    // Update rarest catch
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (stats.rarestCatch && stats.rarestRarity) {
      const currentRarityIndex = rarityOrder.indexOf(daily.rarestCatch.rarity || 'common');
      const newRarityIndex = rarityOrder.indexOf(stats.rarestRarity);
      if (newRarityIndex > currentRarityIndex) {
        daily.rarestCatch = {
          playerUuid, playerName,
          fishId: stats.rarestCatch,
          rarity: stats.rarestRarity
        };
      }
    }

    // Update total
    daily.totalServerCatches += stats.fishCaught || 0;

    this.saveServerRecords(data);
  }

  /**
   * Get player statistics summary
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Statistics summary
   */
  getPlayerStats(playerUuid) {
    const data = this.loadPlayerData(playerUuid);
    const serverRecords = this.getServerRecordsByPlayer(playerUuid);

    return {
      ...data.summary,
      serverRecordsHeld: serverRecords.length,
      serverRecords: serverRecords.map(r => ({
        fishId: r.fishId,
        size: r.size,
        heldSince: r.timestamp
      }))
    };
  }

  /**
   * Compare two players' records
   * @param {string} playerUuid1 - First player UUID
   * @param {string} playerUuid2 - Second player UUID
   * @returns {Object} Comparison result
   */
  comparePlayers(playerUuid1, playerUuid2) {
    const data1 = this.loadPlayerData(playerUuid1);
    const data2 = this.loadPlayerData(playerUuid2);

    const serverRecords1 = this.getServerRecordsByPlayer(playerUuid1);
    const serverRecords2 = this.getServerRecordsByPlayer(playerUuid2);

    // Find shared species
    const sharedSpecies = [];
    const species1 = Object.keys(data1.records);
    const species2 = Object.keys(data2.records);

    for (const fishId of species1) {
      if (data2.records[fishId]) {
        sharedSpecies.push({
          fishId,
          player1: data1.records[fishId],
          player2: data2.records[fishId]
        });
      }
    }

    return {
      player1: {
        uuid: playerUuid1,
        totalSpecies: data1.summary.totalSpeciesCaught,
        totalFish: data1.summary.totalFishCaught,
        serverRecords: serverRecords1.length
      },
      player2: {
        uuid: playerUuid2,
        totalSpecies: data2.summary.totalSpeciesCaught,
        totalFish: data2.summary.totalFishCaught,
        serverRecords: serverRecords2.length
      },
      sharedSpecies,
      comparison: {
        speciesLeader: data1.summary.totalSpeciesCaught > data2.summary.totalSpeciesCaught ? playerUuid1 :
                       data2.summary.totalSpeciesCaught > data1.summary.totalSpeciesCaught ? playerUuid2 : 'tie',
        fishLeader: data1.summary.totalFishCaught > data2.summary.totalFishCaught ? playerUuid1 :
                    data2.summary.totalFishCaught > data1.summary.totalFishCaught ? playerUuid2 : 'tie'
      }
    };
  }

  /**
   * Get leaderboard for a specific fish (largest catches)
   * @param {string} fishId - Fish species ID
   * @param {number} limit - Number of entries
   * @returns {Array} Leaderboard entries
   */
  getFishLeaderboard(fishId, limit = 10) {
    // This would need to scan all player files
    // For efficiency, we'll just return the server record and note that
    // a full implementation would need indexed leaderboards
    const serverRecord = this.getServerRecord(fishId);

    if (serverRecord) {
      return [{
        rank: 1,
        ...serverRecord
      }];
    }

    return [];
  }

  /**
   * Reset daily records (called at server day rollover)
   */
  resetDailyStats() {
    // Keep last 30 days of daily records, clean up older ones
    const data = this.loadServerRecords();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const newDailyRecords = {};
    for (const [date, record] of Object.entries(data.dailyRecords)) {
      if (date >= cutoffStr) {
        newDailyRecords[date] = record;
      }
    }

    data.dailyRecords = newDailyRecords;
    this.saveServerRecords(data);
  }
}

module.exports = {
  RecordTracker
};
