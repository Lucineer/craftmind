/**
 * Example: Run multiple CraftMind bots via the Orchestrator.
 *
 * Usage:
 *   node examples/multi-bot.js [--names=Cody,Nova,Rex] [--bots=3] [--port=25565]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Orchestrator } = require('../src');

const args = process.argv.slice(2);
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1], 10) : 25565;
const countArg = args.find((a) => a.startsWith('--bots='));
const botCount = countArg ? parseInt(countArg.split('=')[1], 10) : 2;
const nameArg = args.find((a) => a.startsWith('--names='));
const defaultNames = ['Cody', 'Nova', 'Rex', 'Iris'];
const names = nameArg ? nameArg.split('=')[1].split(',') : defaultNames.slice(0, botCount);

const orch = new Orchestrator();
orch.serverHost = 'localhost';
orch.serverPort = port;

names.forEach((name) => orch.addAgent(name));

console.log(`🚀 Spawning ${names.join(', ')} on localhost:${port}…`);

orch.startAll().then(() => {
  console.log('✅ All agents connected!');
  console.log('Type commands: <name> <action> [args] | all <action> | status | quit');
  orch.startCLI();
});
