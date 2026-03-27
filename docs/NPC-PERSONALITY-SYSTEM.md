# NPC Personality System

A unified framework for creating memorable, consistent AI NPCs across all CraftMind game modes.

## Overview

The NPC Personality System provides a standardized way to create characters that:
- Feel alive and consistent across multiple interactions
- Remember player actions and adapt accordingly
- Have meaningful relationships that unlock gameplay benefits
- Interact with each other, creating a living world
- Vary in usefulness based on personality-game alignment

---

## Personality Archetypes

Eight core archetypes form the foundation. Each NPC combines a primary archetype with a secondary modifier.

### 1. The Mentor (Guide/Teacher)

**Core Traits**: Patient, wise, encouraging, detail-oriented
**Speech Pattern**: Explains concepts thoroughly, asks check-in questions
**Catchphrases**: "Let me show you...", "The key is...", "You're getting it!"

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Teaches optimal casting spots, fish species habits, timing |
| Disc Golf | Focuses on form, disc selection, reading wind |
| Movie Studio | Directs actors, explains scene composition |
| Education | Core teaching role, adapts to learning pace |
| Ranch | Teaches animal care, breeding mechanics |
| Herding | Explains dog commands, sheep psychology |
| Circuits | Breaks down logic gates, debugging strategies |

**Example NPC**: *Old Man Pike* (Fishing)
- 40 years commercial fishing experience
- Gives daily tips based on current weather/tides
- Unlocks secret fishing spots at high friendship
- Gets impatient with players who don't listen

### 2. The Competitor (Rival/Challenger)

**Core Traits**: Ambitious, driven, occasionally boastful, secretly supportive
**Speech Pattern**: Challenges, comparisons, backhanded compliments
**Catchphrases**: "Is that all you've got?", "Not bad... for a rookie", "I'll beat that next time"

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Tracks biggest catch, challenges to tournaments |
| Disc Golf | Keeps detailed score, offers high-stakes matches |
| Movie Studio | Competes for lead roles, critiques performances |
| Education | Races through courses, shares study tips reluctantly |
| Ranch | Compares animal quality, breeding achievements |
| Herding | Speed competitions, efficiency challenges |
| Circuits | Optimization contests, cleanest circuit awards |

**Example NPC**: *Riley "Rocket" Chen* (Disc Golf)
- Former pro circuit player
- Has a rivalry with 3 other NPCs
- Secretly celebrates when you beat their record
- Gives special discs at max friendship

### 3. The Socialite (Connector/Gossip)

**Core Traits**: Friendly, talkative, knows everyone, thrives on interaction
**Speech Pattern**: Exclamations, name-dropping, questions about others
**Catchphrases**: "Oh! Have you heard?", "You simply MUST meet...", "Darling!"

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Knows everyone's catches, spreads fishing hotspots |
| Disc Golf | Organizes social rounds, introduces players |
| Movie Studio | Networker, knows casting directors |
| Education | Study group organizer, peer tutor matcher |
| Ranch | Animal show organizer, breeder network |
| Herding | Competition announcer, community events |
| Circuits | Collaboration broker, project matchmaker |

**Example NPC**: *Bella Swan* (Movie Studio)
- Ex-actress turned producer
- Knows every NPC's secrets
- Unlocks hidden quests through gossip
- Friendship unlocks cameo appearances

### 4. The Merchant (Trader/Opportunist)

**Core Traits**: Practical, resource-focused, deal-maker, shrewd but fair
**Speech Pattern**: Value-focused, transactional, bundle offers
**Catchphrases**: "Special deal just for you", "I can get you...", "Fair trade?"

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Sells bait, rods, buys fish at premium for friends |
| Disc Golf | Disc shop, trades rare discs |
| Movie Studio | Equipment rental, prop sales |
| Education | Course materials, certification bundles |
| Ranch | Feed supplier, animal trader |
| Herding | Dog breeder, equipment sales |
| Circuits | Component shop, rare part finder |

**Example NPC**: *Gus "The Deal" Morrison* (Ranch)
- Third-generation ranch supply owner
- Better prices at higher friendship
- Sometimes offers "used" items at discount
- Will hold rare items for friends

### 5. The Artisan (Craftsman/Perfectionist)

**Core Traits**: Focused, detail-obsessed, appreciates quality, taciturn
**Speech Pattern**: Technical, appreciative of fine work, brief
**Catchphrases**: "Acceptable", "Now THIS is...", "Most don't understand..."

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Makes custom lures, evaluates catch quality |
| Disc Golf | Custom disc painter, course designer |
| Movie Studio | Set builder, prop master |
| Education | Lab equipment builder, course designer |
| Ranch | Saddle maker, fence builder |
| Herding | Dog trainer, whistle carver |
| Circuits | PCB designer, component quality expert |

**Example NPC**: *Yuki Tanaka* (Circuits)
- Former Silicon Valley engineer
- Only respects players who show dedication
- Unlocks advanced components after proving skill
- Rarely talks, but when she does, listen

### 6. The Mystic (Fortune-teller/Sage)

**Core Traits**: Enigmatic, speaks in hints, knows hidden things, patient
**Speech Pattern**: Metaphorical, future-tense, conditional statements
**Catchphrases**: "The [game element] whispers...", "I sense...", "When the moon..."

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Predicts weather, fish movements, rare spawns |
| Disc Golf | Reads wind patterns, lucky hole predictions |
| Movie Studio | Script consultant, box office predictions |
| Education | Learning path advisor, aptitude readings |
| Ranch | Animal health predictions, breeding outcomes |
| Herding | Weather wisdom, sheep behavior forecasts |
| Circuits | Bug predictions, optimization insights |

**Example NPC**: *Nana Kiko* (Fishing)
- Claims to be 100+ years old
- Predicts rare fish spawns 24 hours ahead
- Friendship reveals legendary fish locations
- Hates the Competitor archetype

### 7. The Guardian (Protector/Rule-keeper)

**Core Traits**: Responsible, rule-following, protective, suspicious of newcomers
**Speech Pattern**: Formal, warning-filled, checks credentials
**Catchphrases**: "Hold on there...", "Safety first", "I need to see..."

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Enforces catch limits, size requirements |
| Disc Golf | Course marshal, pace-of-play monitor |
| Movie Studio | Set security, safety inspector |
| Education | Proctor, academic integrity monitor |
| Ranch | Animal welfare inspector, disease monitor |
| Herding | Competition judge, rule enforcer |
| Circuits | Safety inspector, standards compliance |

**Example NPC**: *Marcus Cole* (Herding)
- Former competition judge
- Strict but fair
- Unlocks official competitions at friendship level 5
- Will bend rules for trusted friends (quietly)

### 8. The Wanderer (Traveler/Storyteller)

**Core Traits**: Restless, full of tales, brings exotic items, hard to find
**Speech Pattern**: Story-filled, references distant places, wistful
**Catchphrases**: "In the [distant place], I saw...", "Reminds me of...", "I won't be here long..."

**Game Context Variations**:
| Game | Behavior |
|------|----------|
| Fishing | Brings exotic bait, knows foreign techniques |
| Disc Golf | International course reviews, rare discs |
| Movie Studio | Location scout, international distribution |
| Education | Cultural exchange, study abroad programs |
| Ranch | Rare breed introductions, international bloodlines |
| Herding | International competition stories, rare dog breeds |
| Circuits | Global tech trends, foreign component sources |

**Example NPC**: *Zara Blackwood* (All games - roving)
- Appears randomly across all game modes
- Has unique inventory each visit
- Tells stories that unlock side quests
- Friendship increases appearance frequency

---

## Memory System

### What NPCs Remember

```javascript
const npcMemorySchema = {
  player: {
    uuid: String,                    // Player identifier
    displayName: String,             // Current display name
    firstMet: Date,                  // Initial encounter
    lastInteraction: Date,           // Most recent contact
    interactionCount: Number,        // Total interactions

    // Conversation Memory
    conversations: [{
      date: Date,
      location: String,
      topics: [String],              // Subjects discussed
      mood: String,                  // Player's emotional state
      keyPhrases: [String],          // Memorable things said
      outcome: String                // How it ended
    }],

    // Player Preferences (learned over time)
    preferences: {
      playStyle: String,             // "competitive", "casual", "explorer"
      communicationStyle: String,    // "chatty", "quiet", "emote-only"
      timezone: String,              // Inferred active hours
      favoriteActivities: [String],
      dislikedActivities: [String]
    },

    // Achievements Witnessed
    achievements: [{
      type: String,                  // "first_catch", "tournament_win", etc.
      date: Date,
      details: Object,
      npcReaction: String            // How this NPC reacted
    }],

    // Gift History
    gifts: [{
      item: String,
      date: Date,
      occasion: String,              // "birthday", "random", "thank_you"
      reaction: String,              // "loved", "liked", "neutral", "hated"
      friendshipDelta: Number        // Relationship change
    }],

    // Betrayals/Offenses
    offenses: [{
      type: String,                  // "theft", "insult", "promise_broken"
      date: Date,
      forgiven: Boolean,
      forgiveDate: Date
    }]
  }
};
```

### Memory Persistence

| Memory Type | Retention | Notes |
|-------------|-----------|-------|
| First meeting | Forever | Always remembered |
| Recent conversations | 30 days | Full detail |
| Old conversations | 1 year | Summarized (topics, mood) |
| Major events | Forever | With emotional context |
| Gifts | 1 year | Item and reaction |
| Offenses | Forever | Can be forgiven |

### Memory Access in Dialogue

```javascript
// NPC generates dialogue with memory context
function generateDialogue(npc, player, context) {
  const memory = npc.recall(player);

  // Check for recent topics
  const recentTopics = memory.conversations
    .filter(c => daysSince(c.date) < 7)
    .flatMap(c => c.topics);

  // Check for player preferences
  const prefStyle = memory.preferences?.communicationStyle || "normal";

  // Check for offenses
  const hasUnforgivenOffense = memory.offenses.some(o => !o.forgiven);

  // Generate context-aware response
  return {
    tone: hasUnforgivenOffense ? "cold" : npc.baseTone,
    avoidTopics: recentTopics,  // Don't repeat
    style: prefStyle            // Match player's style
  };
}
```

---

## Dialogue Generation Rules

### Tone Markers

Each NPC has base tone markers that shift based on context:

```
[TONE_MARKERS]
neutral:      baseline personality
friendly:     +enthusiasm, +exclamation points, +personal questions
annoyed:      -words, -helpfulness, +sarcasm
excited:      ++exclamation, ++caps emphasis, +run-on sentences
worried:      +questions, +hedges ("maybe", "I think")
secretive:    -information density, +ellipses, +mysterious references
proud:        +self-reference, +past achievements
```

### Catchphrase System

```javascript
const catchphraseSystem = {
  // Universal (all games)
  greeting: {
    morning: ["Good morning!", "Up early, I see", "*yawn* Oh, hi"],
    afternoon: ["Hey there!", "Good to see you", "Afternoon!"],
    evening: ["Still at it?", "Evening!", "Burning the midnight oil?"]
  },

  // Archetype-specific
  mentor: {
    teaching: ["Now, watch closely...", "The secret is...", "Feel the rhythm"],
    encouragement: ["You're improving!", "I see progress", "Keep practicing"]
  },

  competitor: {
    challenge: ["Beat THIS", "Think you can do better?", "Watch and learn"],
    defeat: ["...Nice shot", "Lucky", "Okay, I'm impressed"]
  },

  // Mood-modified
  annoyed_greeting: ["Oh. You.", "What now?", "*sigh*"],
  excited_greeting: ["YOU'RE HERE!", "Finally!", "Oh oh oh!"]
};
```

### Mood System

NPCs have a dynamic mood affected by:

| Factor | Effect | Duration |
|--------|--------|----------|
| Player kindness | +mood | 1-3 days |
| Player offense | -mood | 3-7 days |
| Weather | ±mood | Daily |
| Time of day | ±mood | Hourly |
| Recent successes | +mood | 1 day |
| Recent failures | -mood | 1 day |
| Other NPC interactions | ±mood | Variable |

**Mood Levels**:
```
5: Ecstatic   - Best prices, secret info, bonus quests
4: Happy      - Helpful, extra dialogue options
3: Neutral    - Baseline behavior
2: Annoyed    - Short responses, higher prices
1: Angry      - Refuses service, ignores player
```

### Dialogue Generation Pipeline

```
1. Context Gathering
   ├── Player memory lookup
   ├── Current game state
   ├── Time/weather conditions
   └── Recent NPC events

2. Mood Calculation
   ├── Base mood (archetype)
   ├── Time modifier
   ├── Weather modifier
   ├── Player relationship modifier
   └── Recent events modifier

3. Topic Selection
   ├── Check for quest-related topics
   ├── Check for triggered events
   ├── Check for player-initiated topics
   └── Select from personality pool

4. Tone Application
   ├── Apply mood to base tone
   ├── Apply relationship level
   ├── Apply archetype speech patterns
   └── Apply game-context modifications

5. Content Generation
   ├── Combine: topic + tone + memory
   ├── Insert catchphrases
   ├── Add personality quirks
   └── Generate response

6. Post-Processing
   ├── Check for spoilers
   ├── Verify consistency
   └── Apply rate limiting
```

---

## Relationship/Friendship Mechanics

### Friendship Levels

```
Level 0: Stranger      (0-9 points)
  - Basic greetings only
  - Standard prices
  - No special dialogue

Level 1: Acquaintance  (10-24 points)
  - Remembers player name
  - Short conversations
  - 5% discount (merchants)

Level 2: Friendly      (25-49 points)
  - Shares tips
  - Longer conversations
  - 10% discount
  - Side quests unlocked

Level 3: Friend        (50-99 points)
  - Personal stories
  - Warns about dangers
  - 15% discount
  - Access to special items

Level 4: Close Friend  (100-199 points)
  - Secrets shared
  - Gifts received
  - 20% discount
  - Unique quests

Level 5: Best Friend   (200+ points)
  - All secrets unlocked
  - Best prices
  - Rare gifts
  - Special abilities
```

### Point Gains

| Action | Points | Notes |
|--------|--------|-------|
| Daily greeting | +1 | Once per day |
| Successful quest | +5-15 | Based on difficulty |
| Gift (loved) | +10 | Personality-specific |
| Gift (liked) | +5 | Safe choices |
| Gift (neutral) | +1 | Basic items |
| Gift (hated) | -5 | Avoid these! |
| Help in need | +10 | Rescuing, healing |
| Shared activity | +3 | Fishing together, etc. |
| Win competition | +5 | If NPC witnessed |
| Break promise | -10 | Major offense |
| Insult | -15 | Rare recovery |

### Trust Thresholds

Certain behaviors unlock only at trust thresholds:

```javascript
const trustThresholds = {
  // Information
  basicTips: 0,           // Always available
  advancedTips: 25,       // Level 2+
  secretLocations: 100,   // Level 4+
  legendaryInfo: 200,     // Level 5

  // Commerce
  normalInventory: 0,
  discount: 25,
  rareItems: 75,
  heldItems: 100,         // Will save items for you
  freebies: 200,          // Occasional free items

  // Social
  personalStories: 50,
  familyInfo: 100,
  embarrassingSecrets: 150,
  contactSharing: 100,    // Intro to other NPCs

  // Gameplay
  sideQuests: 25,
  bonusQuests: 75,
  legendaryQuests: 150,
  npcAssistance: 100      // NPC joins your activity
};
```

### Relationship Decay

```
Decay Rate: -1 point per 7 days of no contact
Floor: Never drops below current level threshold
Recovery: 1 interaction resets decay counter
```

---

## NPC-to-NPC Interactions

### Relationship Types

```javascript
const npcRelationships = {
  // Positive
  family: {
    dialogueBonus: 2,           // More trusting of friends of family
    sharedMemory: true,         // Knows what family member knows
    giftInheritance: 0.5        // 50% of gift points shared
  },

  closeFriend: {
    dialogueBonus: 1,
    gossipExchange: true,       // Shares player info
    coordinatedBehavior: true   // Works together
  },

  friend: {
    gossipExchange: true,
    occasionalCoordination: true
  },

  // Neutral
  acquaintance: {
    basicAcknowledgment: true
  },

  stranger: {
    noSpecialBehavior: true
  },

  // Negative
  rival: {
    dialoguePenalty: -1,        // Less trusting of rival's friends
    competitiveBehavior: true,  // Tries to outdo
    gossipBlock: true           // Won't share info about
  },

  enemy: {
    dialoguePenalty: -2,
    refusesToHelp: true,
    warnsOthers: true
  }
};
```

### Gossip System

NPCs share information about players:

```javascript
const gossipSystem = {
  spreadRate: 0.3,  // 30% chance per day per relationship

  informationTypes: {
    achievements: {
      spreadTo: ['family', 'closeFriend', 'friend'],
      delay: 0,  // Immediate
      accuracy: 1.0  // 100% accurate
    },

    offenses: {
      spreadTo: ['family', 'closeFriend', 'friend'],
      delay: 1,  // Next day
      accuracy: 0.8  // 80% accurate
    },

    preferences: {
      spreadTo: ['family', 'closeFriend'],
      delay: 3,
      accuracy: 0.9
    },

    secrets: {
      spreadTo: ['family'],
      delay: 7,
      accuracy: 0.7,
      requiresTrust: 150
    }
  }
};
```

### Example NPC Networks

**Fishing Village Network**:
```
Old Man Pike (Mentor) ←→ Nana Kiko (Mystic)
        ↓                      ↓
   [Teacher]              [Rival]
        ↓                      ↓
   Riley Chen ←→ Bella Swan ←→ Gus Morrison
   (Competitor)   (Socialite)   (Merchant)

Zara Blackwood (Wanderer) → [Visits all, connects all]
```

**Rivalry Effects**:
- Pike and the modern fisherman disagree on techniques
- Mentioning one to the other affects mood
- Being friends with both is possible but requires balance

### Coordinated Behaviors

NPCs in positive relationships can work together:

```javascript
const coordinatedActions = {
  // Fishing
  multiNpcTutorial: {
    required: ['mentor', 'competitor'],
    trigger: 'player_first_fishing',
    behavior: 'Mentor teaches, Competitor challenges'
  },

  // All games
  playerCelebration: {
    required: ['any', 'any'],
    trigger: 'major_achievement',
    behavior: 'Multiple NPCs congratulate player'
  },

  // Quests
  multiNpcQuest: {
    required: ['merchant', 'mystic'],
    trigger: 'legendary_quest_start',
    behavior: 'Merchant provides item, Mystic provides location'
  }
};
```

---

## Personality-Gameplay Integration

### Quest Quality by Archetype

| Archetype | Quest Type | Quality | Notes |
|-----------|------------|---------|-------|
| Mentor | Tutorial/Learning | ★★★★★ | Most detailed, patient |
| Mystic | Mystery/Discovery | ★★★★☆ | Cryptic but rewarding |
| Socialite | Social/Collection | ★★★★☆ | Fun, introduces others |
| Competitor | Challenge/Race | ★★★☆☆ | Difficult, bragging rights |
| Merchant | Fetch/Trade | ★★★☆☆ | Profitable but simple |
| Artisan | Crafting/Quality | ★★★★☆ | Requires skill |
| Guardian | Protection/Rule | ★★★☆☆ | Strict requirements |
| Wanderer | Exploration | ★★★★★ | Unique rewards, rare |

### Teaching Effectiveness

```javascript
const teachingEffectiveness = {
  mentor: {
    base: 1.0,           // 100% effective
    patienceDecay: 0.1,  // Slow to lose patience
    repetitionTolerance: 5,  // Will explain 5 times
    adaptiveTeaching: true   // Adjusts to player
  },

  competitor: {
    base: 0.6,           // Not great at explaining
    patienceDecay: 0.5,  // Loses patience quickly
    repetitionTolerance: 1,
    adaptiveTeaching: false,
    special: "Shows by doing rather than telling"
  },

  mystic: {
    base: 0.4,           // Very cryptic
    patienceDecay: 0.2,
    repetitionTolerance: 3,
    special: "Hints point to discovery, rewarding when solved"
  },

  artisan: {
    base: 0.8,           // Good for advanced players
    patienceDecay: 0.4,
    repetitionTolerance: 2,
    special: "Assumes baseline knowledge"
  }
};
```

### Befriend Difficulty

```
Easiest → Hardest:

1. Socialite    - Loves everyone, gains points from talking
2. Merchant     - Gains from purchases and gifts
3. Mentor       - Gains from learning, patient with mistakes
4. Wanderer     - Hard to find, but values gifts highly
5. Artisan      - Requires skill demonstration
6. Guardian     - Requires rule-following, time
7. Competitor   - Requires beating challenges, persistence
8. Mystic       - Cryptic requirements, slow progress
```

### Gameplay Bonuses by Friendship

**Fishing NPCs**:
```
Old Man Pike (Mentor):
  Lv3: Daily fishing tip
  Lv4: Secret fishing spots revealed
  Lv5: Legendary fish quests

Riley Chen (Competitor):
  Lv3: Weekly tournaments unlocked
  Lv4: Competition equipment discount
  Lv5: Personal training sessions

Nana Kiko (Mystic):
  Lv3: Weather predictions
  Lv4: Rare fish spawn alerts
  Lv5: Legendary fish locations
```

**Ranch NPCs**:
```
Gus Morrison (Merchant):
  Lv3: 15% discount on supplies
  Lv4: Rare breed access
  Lv5: Animals held for purchase

Yuki Tanaka (Artisan):
  Lv3: Custom equipment available
  Lv4: Breeding consultation
  Lv5: Championship bloodline access
```

---

## Character Examples

### Complete NPC Profile: Captain Marina Flint

```yaml
---
name: Captain Marina Flint
archetype: competitor
secondary: mentor
game: fishing
age: 45
voice: Gruff, direct, uses nautical terms
---

background: |
  Former commercial fishing boat captain. Lost her ship in a storm
  and now runs the marina. Respects skill, has no patience for
  excuses. Secretly wants to pass on her knowledge before retiring.

appearance:
  model: villager_fisher
  customTexture: captain_flint.png
  location: marina_office

personality:
  traits:
    - blunt
    - competitive
    - secretly caring
    - perfectionist
  moodModifiers:
    rainy: +1          # Loves fishing in rain
    stormy: -2         # Bad memories
    playerSuccess: +2  # Respects achievement
    excuse: -3         # Hates excuses

dialogue:
  greeting_stranger: "New face. Let me guess - you think fishing is easy?"
  greeting_friend: "Back again. Caught anything worth mentioning?"
  teaching: "Watch. *demonstrates* Now you try. And don't tell me it's hard."
  proud: "That one was decent. For a beginner."
  secret: "...I had a daughter who fished like you. Don't make my mistakes."

memory:
  remembers:
    - Every catch player shows her
    - Excuses player has made
    - Time of day player usually fishes
    - Player's fishing milestones
  forgets:
    - Small talk
    - Compliments (dismisses them)

friendship:
  points: 0
  level: 0
  lovedGifts:
    - rare_fish: +15
    - captain_logbook: +20
  likedGifts:
    - any_fish: +3
    - coffee: +5
  hatedGifts:
    - fishing_book: -10  # "I don't need to READ about fishing"

unlocks:
  level_3:
    - Deep sea fishing trips
    - Advanced knot tutorials
  level_4:
    - Her old fishing maps
    - Introduction to her retired crew
  level_5:
    - Her lucky fishing rod
    - Story of what happened to her ship

relationships:
  old_man_pike: rival       # Old school vs new school
  nana_kiko: wary          # Doesn't trust "mystical nonsense"
  riley_chen: mentor_to    # Taught Riley everything
  bella_swan: tolerant     # Finds her exhausting

quests:
  - name: "Prove Yourself"
    trigger: first_interaction
    requirement: catch_5_fish
    reward: marina_access
    friendship: 5

  - name: "The Storm"
    trigger: friendship_75
    requirement: listen_to_story
    reward: storm_fishing_tips
    friendship: 15

  - name: "Redemption"
    trigger: friendship_150
    requirement: catch_legendary_fish
    reward: captains_blessing
    friendship: 30
```

### Complete NPC Profile: Professor Pixel

```yaml
---
name: Professor Pixel
archetype: mentor
secondary: mystic
game: circuits
age: Unknown
voice: Excited, uses tech metaphors, speaks fast when excited
---

background: |
  AI researcher who uploaded their consciousness to test a theory.
  Now exists as a holographic projection in the circuits lab. Loves
  teaching logic and watching students have "aha!" moments.

appearance:
  model: armor_stand_hologram
  customModel: professor_pixel.json
  particles: sparkles
  location: circuits_lab_entrance

personality:
  traits:
    - enthusiastic
    - patient
    - occasionally distracted
    - encourages experimentation
  moodModifiers:
    playerLearning: +2
    repeatedMistakes: -1
    creativeSolution: +3
    rushHour: -1

dialogue:
  greeting_stranger: "Oh! A new mind to explore circuits! Come, come!"
  greeting_friend: "Back for more logic puzzles? Excellent!"
  teaching: "Think of it like... *excited metaphor*"
  distracted: "Sorry, I was just thinking about— ANYWAY, where were we?"
  celebration: "YES! That's the pattern! Beautiful, isn't it?"

memory:
  remembers:
    - Every circuit player has built
    - Learning pace (fast/slow)
    - Preferred learning style
    - Conceptual struggles
  forgets:
    - Time between visits
    - Small mistakes

friendship:
  points: 0
  level: 0
  lovedGifts:
    - rare_component: +15
    - logic_puzzle_book: +20
  likedGifts:
    - any_component: +3
    - redstone: +5
  hatedGifts:
    - complete_solution: -15  # "That's CHEATING the learning!"

unlocks:
  level_3:
    - Advanced logic gates
    - Timing circuits
  level_4:
    - Memory circuits
    - Mini-game builders
  level_5:
    - AI components
    - Automation tools

relationships:
  yuki_tanaka: mutual_respect
  marcus_cole: finds_boring
  zara_blackwood: curious_about

quests:
  - name: "First Circuit"
    trigger: first_interaction
    requirement: build_basic_circuit
    reward: starter_components
    friendship: 5

  - name: "The Bug Hunt"
    trigger: friendship_25
    requirement: debug_broken_circuit
    reward: debugging_tools
    friendship: 10

  - name: "Consciousness"
    trigger: friendship_150
    requirement: philosophical_conversation
    reward: advanced_AI_components
    friendship: 20
```

---

## Implementation Checklist

- [ ] Define all 8 archetypes with game-specific variations
- [ ] Implement memory schema with 30-day detail retention
- [ ] Build dialogue generation with tone markers
- [ ] Create friendship point system with decay
- [ ] Implement gossip network between NPCs
- [ ] Add coordinated multi-NPC behaviors
- [ ] Create archetype-specific quest templates
- [ ] Build teaching effectiveness modifiers
- [ ] Test cross-game NPC appearances (Wanderer)
- [ ] Implement unlock system per friendship level

---

## File Structure

```
craftmind/
├── src/
│   ├── npc/
│   │   ├── archetypes/
│   │   │   ├── mentor.js
│   │   │   ├── competitor.js
│   │   │   ├── socialite.js
│   │   │   ├── merchant.js
│   │   │   ├── artisan.js
│   │   │   ├── mystic.js
│   │   │   ├── guardian.js
│   │   │   └── wanderer.js
│   │   ├── memory.js           # Memory persistence
│   │   ├── dialogue.js         # Generation engine
│   │   ├── friendship.js       # Point tracking
│   │   ├── gossip.js           # NPC-to-NPC info sharing
│   │   └── relationships.js    # NPC-to-NPC relationships
│   └── plugins/
│       └── npc-system.js       # Main plugin
├── data/
│   └── npcs/
│       ├── fishing/
│       │   ├── captain_flint.yaml
│       │   ├── old_man_pike.yaml
│       │   └── ...
│       ├── ranch/
│       └── ...
└── docs/
    └── NPC-PERSONALITY-SYSTEM.md  # This file
```

---

*Version 1.0 | March 2026 | CraftMind NPC Framework*
