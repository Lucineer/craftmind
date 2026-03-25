/**
 * Example: Run a single CraftMind bot that connects to a server.
 *
 * Usage:
 *   node examples/single-bot.js [host] [port] [username]
 *   ZAI_API_KEY=sk-… node examples/single-bot.js localhost 25565 Cody
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createBot, PERSONALITIES } = require('../src');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3], 10) || 25565;
const username = process.argv[4] || 'Cody';

console.log(`🤖 Connecting ${username} to ${host}:${port} …`);

const bot = createBot({
  host,
  port,
  username,
  personality: username.toLowerCase(),
  llmApiKey: process.env.ZAI_API_KEY,
  onStart() {
    console.log(`✅ ${username} spawned!`);
    bot.chat(`Hey! I'm ${username}. Talk to me or use !help for commands.`);
  },
  onEnd() {
    console.log(`❌ ${username} disconnected.`);
    process.exit(0);
  },
});
