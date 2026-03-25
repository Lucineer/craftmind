/**
 * @example emergent-fish.js
 * Demo of fish school with emergent behavior detection.
 *
 * Run: node examples/emergent-fish.js
 */

const { BehaviorScript } = require('../src');
const { NoveltyDetector, SEVERITY } = require('../src');
const { EmergenceTracker } = require('../src');

console.log('═══ CraftMind Emergent Fish School Demo ═══\n');

// ── Setup ─────────────────────────────────────────────────────────────────────

const tracker = new EmergenceTracker({ minFrequency: 3 });
const detector = new NoveltyDetector({ sigmaThreshold: 2 });

// Fish behavior script
const fishScript = new BehaviorScript([
  { id: 'school', condition: 'neighbors > 3 AND !threat', action: 'school', priority: 3 },
  { id: 'flee', condition: 'threat', action: 'flee', priority: 10 },
  { id: 'feed', condition: 'hungry AND food_near', action: 'eat', priority: 5 },
  { id: 'wander', condition: 'neighbors <= 3', action: 'wander', priority: 1 },
]);

// Simulated fish school
class Fish {
  constructor(id) {
    this.id = id;
    this.x = Math.random() * 100;
    this.y = Math.random() * 100;
    this.hungry = Math.random() > 0.5;
    this.state = { neighbors: 0, threat: false, food_near: Math.random() > 0.7 };
  }

  update(school) {
    const nearby = school.filter(f => f !== this && Math.hypot(f.x - this.x, f.y - this.y) < 20);
    this.state.neighbors = nearby.length;
    this.state.hungry = this.hungry;
    this.state.food_near = Math.random() > 0.8;

    const result = fishScript.execute(this.state);
    this.lastAction = result.action;

    // Apply movement
    switch (result.action) {
      case 'school':
        if (nearby.length > 0) {
          const center = nearby.reduce((acc, f) => ({ x: acc.x + f.x, y: acc.y + f.y }), { x: 0, y: 0 });
          this.x += (center.x / nearby.length - this.x) * 0.1;
          this.y += (center.y / nearby.length - this.y) * 0.1;
        }
        break;
      case 'flee':
        this.x += (Math.random() - 0.5) * 20;
        this.y += (Math.random() - 0.5) * 20;
        break;
      case 'wander':
        this.x += (Math.random() - 0.5) * 5;
        this.y += (Math.random() - 0.5) * 5;
        break;
      case 'eat':
        this.hungry = false;
        break;
    }

    return result.action;
  }
}

// ── Simulation ────────────────────────────────────────────────────────────────

const school = Array.from({ length: 12 }, (_, i) => new Fish(i));
const catchRates = [];

console.log('🐟 Running 30 ticks of fish school simulation...\n');

for (let tick = 0; tick < 30; tick++) {
  // Occasional threat
  if (tick === 15) {
    console.log('🦈 SHARK appears! All fish flee!\n');
    for (const fish of school) fish.state.threat = true;
  }
  if (tick === 18) {
    for (const fish of school) fish.state.threat = false;
  }

  // Occasional food bloom
  if (tick === 10 || tick === 22) {
    console.log('🌿 Food bloom! Some fish eat.\n');
    for (const fish of school) fish.state.food_near = true;
  }

  // Track catch rate (simulated)
  const catchRate = Math.random() * 0.3 + 0.1;
  catchRates.push(catchRate);
  detector.track('catch_rate', catchRate);

  // Run fish
  const actions = new Map();
  for (const fish of school) {
    const action = fish.update(school);
    actions.set(action, (actions.get(action) || 0) + 1);
    tracker.log('fish_behavior', { action, fish: fish.id });
  }

  if (tick % 10 === 0) {
    const actionStr = [...actions.entries()].map(([a, c]) => `${a}:${c}`).join(', ');
    console.log(`Tick ${tick}: ${actionStr}`);
  }
}

// ── Detect Emergence ──────────────────────────────────────────────────────────

console.log('\n🔍 Detecting emergent patterns...');
const discoveries = tracker.detectPatterns();
console.log(`   Found ${tracker.patterns.length} pattern(s)\n`);

for (const pattern of tracker.patterns.slice(0, 3)) {
  console.log(`   🧬 Pattern: ${pattern.id}`);
  console.log(`      Sequence: ${pattern.sequence.join(' → ')}`);
  console.log(`      Frequency: ${pattern.frequency}`);
  if (pattern.causalityHint) {
    console.log(`      Causality: ${pattern.causalityHint.hint}`);
  }
  console.log();
}

// ── Novelty Events ────────────────────────────────────────────────────────────

console.log('📊 Novelty events:');
const noveltyHistory = detector.getHistory();
if (noveltyHistory.length === 0) {
  console.log('   No significant anomalies detected (stable catch rate)');
} else {
  for (const event of noveltyHistory) {
    console.log(`   ${event.severity}: ${event.key} = ${event.value} (${event.sigma}σ)`);
  }
}

// ── Export insight card ───────────────────────────────────────────────────────

if (tracker.patterns.length > 0) {
  const card = tracker.exportInsightCard(tracker.patterns[0].id);
  console.log(`\n📦 Exported insight card: ${card.type}`);
  console.log(`   Pattern: ${JSON.stringify(card.pattern.signature).slice(0, 60)}...`);
}

console.log('\n✅ Demo complete!');
