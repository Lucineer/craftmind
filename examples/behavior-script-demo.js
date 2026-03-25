/**
 * @example behavior-script-demo.js
 * Standalone demo of the Behavior Script Engine (no Minecraft required).
 *
 * Run: node examples/behavior-script-demo.js
 */

const { BehaviorScript, diffScripts, mergeScripts, validateScript } = require('../src');

console.log('═══ CraftMind Behavior Script Engine Demo ═══\n');

// ── 1. Create a behavior script ────────────────────────────────────────────────

const fishermanScript = new BehaviorScript([
  { id: 'cast', condition: 'near_water AND has_rod AND !line_in', action: 'cast_line', priority: 10 },
  { id: 'reel', condition: 'hooked_fish AND tension > 0.7', action: 'reel_in', priority: 20 },
  { id: 'rest', condition: 'energy < 0.2', action: 'rest', priority: 30 },
  { id: 'bait', condition: 'bait_count == 0', action: 'get_bait', priority: 25 },
  { id: 'day_fish', condition: '@time 06:00-18:00', action: 'optimal_fish', priority: 5 },
]);

console.log('📋 Fisherman Script loaded:');
console.log(`   ${fishermanScript.rules.length} rules, version ${fishermanScript.version}\n`);

// ── 2. Execute against state ───────────────────────────────────────────────────

const state = { near_water: true, has_rod: true, line_in: false, energy: 0.8, hooked_fish: false, tension: 0, bait_count: 5 };
const result = fishermanScript.execute(state);
console.log(`🎣 State: energy=${state.energy}, line_in=${state.line_in}`);
console.log(`   → Action: ${result.action} (rule: ${result.ruleId})\n`);

// Low energy overrides everything
state.energy = 0.1;
const restResult = fishermanScript.execute(state);
console.log(`😴 State: energy=${state.energy}`);
console.log(`   → Action: ${restResult.action} (rule: ${restResult.ruleId})\n`);

// ── 3. Diff and merge ─────────────────────────────────────────────────────────

const newRules = [
  { id: 'cast', condition: 'near_water AND has_rod AND !line_in AND energy > 0.3', action: 'cast_line', priority: 10 },
  { id: 'deep_dive', condition: 'depth > 15 AND bait_type == "surface"', action: 'change_bait', priority: 22 },
  { id: 'predator', condition: 'shark_near AND !protected', action: 'flee', priority: 50 },
];

const diff = fishermanScript.diff(newRules);
console.log('📊 Script Diff:');
console.log(`   Added: ${diff.added.map(r => r.id).join(', ') || 'none'}`);
console.log(`   Removed: ${diff.removed.map(r => r.id).join(', ') || 'none'}`);
console.log(`   Modified: ${diff.modified.map(r => r.id).join(', ') || 'none'}\n`);

fishermanScript.merge(newRules, 'llm_suggestion');
console.log(`🔄 Merged! Now ${fishermanScript.rules.length} rules, version ${fishermanScript.version}\n`);

// ── 4. Rollback ───────────────────────────────────────────────────────────────

fishermanScript.rollback();
console.log(`↩️ Rolled back! Now ${fishermanScript.rules.length} rules, version ${fishermanScript.version}\n`);

// ── 5. Serialization ──────────────────────────────────────────────────────────

const json = fishermanScript.serialize();
console.log(`💾 Serialized: ${json.length} bytes`);
const restored = BehaviorScript.deserialize(json);
console.log(`📂 Restored: ${restored.rules.length} rules\n`);

// ── 6. Performance benchmark ──────────────────────────────────────────────────

const bigRules = Array.from({ length: 200 }, (_, i) => ({
  id: `rule_${i}`,
  condition: `x > ${i} AND y < ${100 - i}`,
  action: `act_${i}`,
  priority: i,
}));
const bigScript = new BehaviorScript(bigRules);
const testState = { x: 50, y: 50 };
const start = performance.now();
for (let i = 0; i < 10000; i++) bigScript.execute(testState);
const elapsed = performance.now() - start;
console.log(`⚡ Performance: 10,000 executions of 200-rule script in ${elapsed.toFixed(2)}ms`);
console.log(`   (${(elapsed / 10).toFixed(3)}μs per execution)\n`);

console.log('✅ Demo complete!');
