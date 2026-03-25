# CraftMind Research Document

## Executive Summary

CraftMind aims to build a next-generation AI agent for Minecraft that combines the best ideas from multiple agent frameworks while introducing novel contributions in personality, voice interaction, and script-based learning. This document presents comprehensive research findings, competitive analysis, architectural recommendations, and implementation roadmap.

### Key Findings

1. **Current State of Art**: Voyager (MineDojo) represents the cutting edge with its automatic curriculum and skill library, but lacks persistent personality, voice interaction, and true multi-session continuity.

2. **Novel Opportunities**: No existing Minecraft AI agent successfully combines:
   - Voice-based natural language interaction
   - Persistent personality and emotional continuity
   - Script learning that feels like human skill acquisition
   - Multi-session memory with semantic retrieval

3. **Technical Foundation**: Mineflayer provides a robust protocol-level Minecraft client, but requires significant additions for complex behaviors, memory, and LLM integration.

4. **Jetson Orin Nano Constraints**: ARM64 architecture and limited memory (8GB) require careful model selection (Whisper-tiny/base, quantized LLMs, efficient embeddings).

---

## 1. Game AI / NPC Intelligence Systems

### 1.1 Traditional Game AI Techniques

#### Behavior Trees
- **Structure**: Hierarchical task organization with control flow nodes (Sequence, Selector, Decorator)
- **Strengths**: Modular, reusable, visual debugging, industry standard
- **Weaknesses**: Can become complex for emergent behavior, limited learning capability
- **Use in CraftMind**: Foundation for low-level action sequences (pathfind → approach → interact)

#### GOAP (Goal-Oriented Action Planning)
- **Pioneered by**: F.E.A.R. (2005), widely used since
- **Mechanism**: Backward chaining from goals to find action sequences using A* search
- **Strengths**: Emergent behavior, handles dynamic situations, goal-driven
- **Weaknesses**: Computationally expensive for large action sets, requires careful state modeling
- **Use in CraftMind**: High-level goal planning (e.g., "build shelter" → [gather wood → craft planks → place blocks])

#### HTN (Hierarchical Task Networks)
- **Mechanism**: Decomposes high-level tasks into primitive actions using domain knowledge
- **Strengths**: Domain expert knowledge encoding, predictable behavior, efficient
- **Weaknesses**: Requires hand-crafted domain knowledge, less flexible than GOAP
- **Use in CraftMind**: Task decomposition for complex multi-step activities

#### Utility AI
- **Mechanism**: Scores possible actions based on multiple weighted considerations
- **Strengths**: Highly flexible, easy to tune, natural for personality expression
- **Weaknesses**: Can produce inconsistent behavior, requires careful tuning
- **Use in CraftMind**: Personality-driven decision making (curious vs cautious, social vs solitary)

#### Reinforcement Learning
- **Deep RL**: AlphaGo, AlphaStar, OpenAI Five demonstrate superhuman game play
- **MineRL**: Minecraft-specific RL competition since 2019
- **Strengths**: Learns optimal behavior from experience
- **Weaknesses**: Sample inefficient, requires massive training, hard to shape behavior
- **Use in CraftMind**: Not primary approach (too sample inefficient), but could optimize specific skills

### 1.2 LLM-Based Game Agents (2024-2026 State of Art)

#### Key Architectural Patterns

1. **ReAct (Reasoning + Acting)**: Interleave reasoning traces with actions
   - Used by: AutoGPT, BabyAGI, most LLM agents
   - Strength: Transparent decision-making, debuggable

2. **Reflexion**: Self-critique and memory-based improvement
   - Used by: Voyager for error correction
   - Strength: Learns from failures

3. **Tool Use / Function Calling**: LLM as controller invoking external tools
   - Used by: LangChain agents, Claude tool use
   - Strength: Modular capabilities, easy extension

4. **Memory-Augmented Agents**: 
   - **MemGPT**: Hierarchical memory with OS-like management
   - **Mem0**: Production-ready memory layer with vector search
   - Strength: Long-term consistency, cross-session recall

5. **Multi-Agent Systems**:
   - **AutoGen**: Conversation-based multi-agent collaboration
   - **CrewAI**: Role-based agent teams
   - Strength: Specialized capabilities, emergent problem-solving

---

## 2. Competitive Landscape Analysis

### 2.1 Voyager (MineDojo)

**Source**: https://github.com/MineDojo/Voyager  
**Paper**: "Voyager: An Open-Ended Agent with Large Language Models" (2023)

#### Architecture
```
┌─────────────────────────────────────────────┐
│              Voyager Agent                    │
├─────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────────┐   │
│  │   LLM Core  │◄──►│  Skill Library   │   │
│  │  (GPT-4)    │    │  (JSON Programs) │   │
│  └─────────────┘    └──────────────────┘   │
│         │                    ▲              │
│         ▼                    │              │
│  ┌─────────────────────────────────────┐   │
│  │      Automatic Curriculum           │   │
│  │   (Progressive Task Generation)     │   │
│  └─────────────────────────────────────┘   │
│         │                                   │
│         ▼                                   │
│  ┌─────────────────────────────────────┐   │
│  │     Iterative Refinement            │   │
│  │   (Error Feedback → Code Fix)       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Mineflayer API    │
│  (Minecraft Client) │
└─────────────────────┘
```

#### Key Innovations
1. **Automatic Curriculum**: LLM generates progressively harder tasks based on current skill level
2. **Skill Library**: Executable JavaScript programs stored as reusable skills
3. **Iterative Refinement**: Execution errors fed back to LLM for code correction
4. **No Training**: Pure prompting, no model fine-tuning

#### Strengths
- Impressive open-ended learning (obtains 2x more items than baseline)
- Self-improving through skill accumulation
- Generalizes to novel tasks using learned skills

#### Limitations
- **No persistent personality**: Purely task-oriented
- **No voice interface**: Text-only interaction
- **Single-session skills**: Skills stored per run, not truly persistent
- **Expensive**: Heavy GPT-4 usage (~$15-30 per play session)
- **No multi-agent**: Single agent only
- **Limited exploration**: Focuses on tech tree progression, not social/emergent play

### 2.2 STEVE-1

**Source**: https://github.com/Shalev-Lifshitz/STEVE-1  
**Paper**: "STEVE-1: A Generative Model for Text-to-Behavior in Minecraft"

#### Architecture
- Vision-language model trained on Minecraft gameplay videos
- Uses MineCLIP for multimodal understanding
- Generates primitive actions from text instructions

#### Key Innovations
1. **Visual Understanding**: Can process game screenshots
2. **Video Pretraining**: Learned from human gameplay recordings
3. **Instruction Following**: Follows natural language commands

#### Limitations
- Requires significant training (not pure prompting)
- Less flexible than code-generation approaches
- Limited to trained behaviors

### 2.3 JARVIS-1

**Source**: https://github.com/CraftJarvis/JARVIS-1  
**Paper**: "JARVIS-1: Open-World Multi-Task Agents with Memory-Augmented Multimodal Language Models"

#### Architecture
- Multimodal language model with memory augmentation
- Can handle both visual observations and text
- Uses pre-trained models (CLIP, LLM)

#### Key Innovations
1. **Multimodal Memory**: Stores visual and textual experiences
2. **Pre-trained Knowledge**: Leverages large-scale pretraining
3. **Multi-task Learning**: Handles diverse Minecraft tasks

#### Limitations
- Complex training pipeline
- Heavy computational requirements
- Less accessible for modification

### 2.4 MineWright

**Source**: https://github.com/superinstance/minewright

#### Architecture (from ARCHITECTURE_QUICK_REFERENCE.md)
```
┌────────────────────────────────────────────────────────┐
│                    MineWright                          │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │          Script Layer Learning System            │  │
│  │  ┌────────────┐         ┌────────────────────┐   │  │
│  │  │  System 1  │◄───────►│     System 2       │   │  │
│  │  │  (Fast)    │         │     (Slow)         │   │  │
│  │  │  Cached    │         │     LLM            │   │  │
│  │  │  Scripts   │         │     Reasoning      │   │  │
│  │  └────────────┘         └────────────────────┘   │  │
│  │        │                         │               │  │
│  │        ▼                         ▼               │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │            Script Cache                     │  │  │
│  │  │   (Reusable behavior programs)             │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Execution Layer                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │  │
│  │  │pathfinder│  │  world   │  │  inventory   │   │  │
│  │  │          │  │  state   │  │              │   │  │
│  │  └──────────┘  └──────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                               │
│                        ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Mineflayer Core                     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### Script Layer Learning System (from SCRIPT_LAYER_LEARNING_SYSTEM.md)

**System 1 (Fast Thinking)**:
- Pre-cached JavaScript scripts for common actions
- Instant execution, no LLM call needed
- Example: "walk to player", "mine block", "eat food"

**System 2 (Slow Thinking)**:
- LLM-based reasoning for novel situations
- Generates new code/scripts when cached ones don't apply
- Can promote successful scripts to System 1

**Script Promoting Criteria**:
1. High success rate (>90%)
2. Used frequently (>5 times)
3. Low execution variance
4. User-verified correctness

#### Strengths
- **Dual-process architecture**: Efficient for common tasks, flexible for novel ones
- **Token efficiency**: Reduces LLM calls via caching
- **Theoretically grounded**: Based on Kahneman's System 1/System 2
- **Self-improving**: Scripts get promoted from System 2 to System 1

#### Limitations
- **Mostly theoretical**: Implementation incomplete
- **No personality**: No character/persistent identity
- **No voice**: Text-only
- **No semantic memory**: Scripts stored, but no episodic recall
- **Script quality**: Generated scripts may have bugs

### 2.5 Mineflayer Ecosystem

**Core**: https://github.com/PrismarineJS/mineflayer

#### Notable Plugins

| Plugin | Purpose | Relevance |
|--------|---------|-----------|
| `mineflayer-pathfinder` | A* pathfinding with movement costs | Essential for navigation |
| `mineflayer-statemachine` | Finite state machine for bot behavior | Behavior organization |
| `mineflayer-pvp` | Combat behavior | Fighting mechanics |
| `mineflayer-collectblock` | High-level block collection API | Resource gathering |
| `mineflayer-tool` | Automatic tool selection | Mining efficiency |
| `mineflayer-auto-eat` | Automatic hunger management | Survival |
| `prismarine-viewer` | Web-based bot vision | Debugging, potential vision input |
| `prismarine-web-client` | Browser-based Minecraft client | UI for agent observation |

#### Protocol Capabilities
- Full Minecraft 1.8-1.21+ protocol support
- Entity tracking (players, mobs, items)
- Block interactions (dig, place, use)
- Inventory management
- Chat communication
- World state queries

#### Limitations
- No built-in AI/LLM integration
- Requires JavaScript/Node.js
- Single-threaded event loop
- Complex behaviors must be built on top

### 2.6 MindCraft (Kolbytn)

**Source**: https://github.com/kolbytn/mindcraft

#### Approach
- LLM-controlled Minecraft bot
- GPT-4 for decision making
- Integration with Mineflayer

#### Strengths
- Working LLM-Minecraft integration
- Demonstrates feasibility

#### Limitations
- Basic implementation
- No learning system
- No persistent memory

### 2.7 Baritone

**Source**: https://github.com/cabaletta/baritone

#### Approach
- Java-based Minecraft pathfinder and AI
- Used in Impact client
- Extremely optimized pathfinding (30x faster than predecessors)

#### Key Features
- A* pathfinding with sophisticated heuristics
- Goal-based behavior system
- Mining, building, combat capabilities
- CLI and API interfaces

#### Relevance
- **Pathfinding algorithms**: Could inform Mineflayer-pathfinder optimizations
- **Goal system**: Useful patterns for agent goals
- **Not directly usable**: Java-based, not Node.js

### 2.8 MineCLIP

**Source**: https://github.com/MineDojo/MineCLIP

#### Approach
- Multimodal reward model for Minecraft
- CLIP-style contrastive learning
- Aligns video clips with text descriptions

#### Use Cases
1. **Reward Shaping**: RL agents get shaped rewards
2. **Goal Verification**: Check if agent achieved goal
3. **Behavior Evaluation**: Score agent behavior quality

#### Relevance
- Could verify agent is following player intent
- Potential for multimodal understanding
- Requires significant compute

### 2.9 Agent Frameworks

#### MemGPT
**Source**: https://github.com/cpacker/memgpt

- OS-like memory management
- Hierarchical: Core memory, Context memory, Archival memory
- Self-directed memory decisions

#### Mem0
**Source**: https://github.com/mem0ai/mem0

- Production-ready memory layer
- Vector search for retrieval
- Multi-level: User, Session, Agent memory
- 26% better accuracy than OpenAI memory on benchmarks

#### AutoGPT
**Source**: https://github.com/Significant-Gravitas/AutoGPT

- Task planning and execution loop
- Tool use pattern
- Memory and planning modules

#### BabyAGI
**Source**: https://github.com/yoheinakajima/babyagi

- Task queue management
- Execution → Task creation → Prioritization loop
- Lightweight, extensible

---

## 3. Novel Contributions: What Makes CraftMind Different

### 3.1 The Gap in Existing Solutions

| Feature | Voyager | MineWright | MindCraft | CraftMind |
|---------|---------|------------|-----------|-----------|
| Script Learning | ✅ | ✅ (theoretical) | ❌ | ✅ |
| Personality | ❌ | ❌ | ❌ | ✅ |
| Voice Interface | ❌ | ❌ | ❌ | ✅ |
| Persistent Memory | ❌ | ❌ | ❌ | ✅ |
| Multi-session | ❌ | ❌ | ❌ | ✅ |
| Human-like Imperfection | ❌ | ❌ | ❌ | ✅ |
| Local/Edge Deploy | ❌ | ❌ | ❌ | ✅ (Jetson) |
| Token Efficiency | ❌ | ✅ | ❌ | ✅ |

### 3.2 Proposed Novel Contributions

#### 1. Personality-Driven Decision Making

**Concept**: The agent has persistent personality traits that influence all decisions, not just task execution.

**Implementation**:
```typescript
interface Personality {
  // Big Five traits (-1 to 1)
  openness: number;        // curiosity, creativity
  conscientiousness: number; // organization, dependability
  extraversion: number;     // sociability, assertiveness
  agreeableness: number;    // cooperation, trust
  neuroticism: number;      // emotional stability
  
  // Game-specific traits
  riskTolerance: number;    // cave exploration, combat
  patience: number;         // farming, building
  creativity: number;       // unique builds, solutions
  sociability: number;      // player interaction frequency
}
```

**Novel Aspect**: Personality affects:
- Task prioritization (curious agents explore, patient agents build)
- Communication style (introverted = terse, extraverted = chatty)
- Risk-taking behavior (brave = deep caves, cautious = safe zones)
- Emotional responses (frustration tolerance, celebration intensity)

#### 2. Voice-First Interaction

**Concept**: Natural voice conversation with the agent while playing together.

**UX Flow**:
```
┌─────────────────────────────────────────────────────┐
│                Voice Interaction Flow                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Player speaks ──► Whisper STT ──► Text             │
│        │                                    │       │
│        │                                    ▼       │
│        │                            ┌────────────┐  │
│        │                            │ Intent     │  │
│        │                            │ Detection  │  │
│        │                            └────────────┘  │
│        │                                    │       │
│        │                    ┌───────────────┼──────┐│
│        │                    ▼               ▼      ▼│
│        │              ┌────────┐   ┌────────┐  ... │
│        │              │Command │   │Question│      │
│        │              └────────┘   └────────┘      │
│        │                    │               │       │
│        │                    ▼               ▼       │
│        │              ┌──────────────────────────┐  │
│        │              │   LLM Processing         │  │
│        │              │   (Context + Memory)     │  │
│        │              └──────────────────────────┘  │
│        │                    │               │       │
│        │                    ▼               ▼       │
│        │              ┌────────┐   ┌────────────┐  │
│        │              │Execute │   │  TTS       │  │
│        │              │Action  │   │  Response  │  │
│        │              └────────┘   └────────────┘  │
│        │                    │               │       │
│        ▼                    ▼               ▼       │
│  [Game World]         [Bot acts]    [Player hears] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Novel Aspects**:
- **Push-to-talk**: In-game voice key binding (not always listening)
- **Contextual responses**: Agent knows what it's doing and can explain
- **Emotional voice**: TTS reflects agent's current emotional state
- **Ambient commentary**: Agent can narrate its actions aloud
- **Interruption handling**: "Wait, stop!" → pause current action

#### 3. Human-Like Imperfection

**Concept**: Perfect AI feels robotic. Human players make mistakes, get distracted, have quirks.

**Implementation**:
```typescript
interface Imperfection {
  // Execution variance
  actionNoise: number;      // Small random variations in actions
  timingVariance: number;   // Not instant, variable delays
  
  // Cognitive limitations
  attentionSpan: number;    // Can get distracted
  forgetfulness: number;    // Sometimes forgets tasks
  confusionRate: number;    // Misunderstands occasionally
  
  // Behavioral quirks
  habits: Habit[];          // Repeated patterns (always closes doors)
  superstitions: string[];  // Irrational behaviors
  preferences: Map<string, number>; // Arbitrary likes/dislikes
}
```

**Novel Aspects**:
- **Realistic mistakes**: Occasionally mishears, misunderstands, fails
- **Attention drift**: Gets distracted by interesting things
- **Preference expression**: "I don't like mining, can we build instead?"
- **Recovery**: Gracefully handles and apologizes for mistakes

#### 4. Semantic Memory with Episodic Recall

**Concept**: Not just skill scripts, but rich episodic memories of experiences.

**Memory Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                    Memory System                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │            Working Memory (Short-term)            │ │
│  │  • Current task context                          │ │
│  │  • Recent observations                           │ │
│  │  • Active goals                                  │ │
│  │  [Ring buffer: ~50 items]                        │ │
│  └───────────────────────────────────────────────────┘ │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │           Episodic Memory (Experiences)          │ │
│  │  • Timestamped events                            │ │
│  │  • Who, what, where, when                        │ │
│  │  • Emotional valence                             │ │
│  │  • Vector embeddings for retrieval               │ │
│  │  [SQLite + FAISS: thousands of events]           │ │
│  └───────────────────────────────────────────────────┘ │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │           Semantic Memory (Knowledge)            │ │
│  │  • Facts about players                           │ │
│  │  • World state knowledge                         │ │
│  │  • Skill knowledge                               │ │
│  │  • Conceptual relationships                      │ │
│  │  [Knowledge graph + vector store]                │ │
│  └───────────────────────────────────────────────────┘ │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │           Procedural Memory (Skills)             │ │
│  │  • Cached scripts (System 1)                     │ │
│  │  • Skill metadata (success rate, usage count)    │ │
│  │  • Dependencies and preconditions                │ │
│  │  [JavaScript modules + metadata DB]              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Novel Aspects**:
- **"Remember when..."**: Can recall specific past events
- **Player modeling**: "You always build towers" / "You don't like fighting"
- **Cross-session continuity**: Knows what happened last time you played
- **Memory consolidation**: Important memories promoted to long-term

#### 5. Script Learning System (Improved from MineWright)

**Improvements over MineWright**:
1. **Semantic matching**: Scripts matched by intent, not just exact parameters
2. **Confidence scoring**: Knows when cached script might not apply
3. **Continuous refinement**: Scripts improve over time
4. **Human feedback loop**: Player can rate/correct scripts

**Script Lifecycle**:
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Novel   │────►│  LLM     │────►│  Execute │────►│  Success │
│  Task    │     │  Generate│     │  & Monitor│    │    ?     │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                    ┌───────────────────┬───────────────┘
                    ▼                   ▼
             ┌──────────┐        ┌──────────┐
             │   Add    │        │  Retry   │
             │  Script  │        │  Modify  │
             │  (Cache) │        │    ?     │
             └──────────┘        └────┬─────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
             ┌──────────┐      ┌──────────┐      ┌──────────┐
             │  Modify  │      │   Ask    │      │  Give    │
             │  Script  │      │  Player  │      │    Up    │
             └──────────┘      └──────────┘      └──────────┘
```

---

## 4. Proposed Architecture

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CraftMind System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Presentation Layer                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │   Voice    │  │    Chat    │  │   Debug    │  │   WebSocket    │  │  │
│  │  │ Interface  │  │ Interface  │  │    UI      │  │    Events      │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          Agent Core Layer                             │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                      Decision Engine                             │ │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │ │  │
│  │  │  │  System 1  │  │  System 2  │  │    Personality Module      │ │ │  │
│  │  │  │  (Cached)  │  │   (LLM)    │  │  (Traits, Emotions, Style) │ │ │  │
│  │  │  └────────────┘  └────────────┘  └────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                       Goal Manager                               │ │  │
│  │  │  • Goal prioritization  • Subgoal decomposition                 │ │  │
│  │  │  • Progress tracking    • Interruption handling                 │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Action Executor                               │ │  │
│  │  │  • Script execution     • Action validation                     │ │  │
│  │  │  • Error recovery       • State monitoring                      │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Memory Layer                                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  Working   │  │  Episodic  │  │  Semantic  │  │   Procedural   │  │  │
│  │  │  Memory    │  │  Memory    │  │  Memory    │  │   Memory       │  │  │
│  │  │ (RAM)      │  │ (Vector)   │  │ (Graph)    │  │   (Scripts)    │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐│  │
│  │  │                     Memory Manager                                ││  │
│  │  │  • Consolidation  • Retrieval  • Forgetting  • Association      ││  │
│  │  └──────────────────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       Minecraft Interface Layer                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                       Mineflayer Core                            │ │  │
│  │  │  • Protocol handling  • Entity tracking  • World state          │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                     Plugin Ecosystem                             │ │  │
│  │  │  pathfinder │ pvp │ collectblock │ tool │ statemachine │ ...    │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    World Model                                   │ │  │
│  │  │  • Block map  • Entity positions  • Inventory state             │ │  │
│  │  │  • Player tracking  • Structure recognition                     │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Infrastructure Layer                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │   Config   │  │  Logging   │  │  Metrics   │  │    Storage     │  │  │
│  │  │  Manager   │  │  System    │  │  Dashboard │  │   (SQLite)     │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Voice UX Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Voice Interaction Flow                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PLAYER                          AGENT                        WORLD     │
│    │                               │                            │       │
│    │  [Push-to-talk key]           │                            │       │
│    │────────────────────────────►  │                            │       │
│    │                               │                            │       │
│    │  "Hey, can you build a        │                            │       │
│    │   small house nearby?"        │                            │       │
│    │────────────────────────────►  │                            │       │
│    │                               │                            │       │
│    │                          ┌────┴────┐                       │       │
│    │                          │ Whisper │                       │       │
│    │                          │  STT    │                       │       │
│    │                          │(~200ms) │                       │       │
│    │                          └────┬────┘                       │       │
│    │                               │                            │       │
│    │                          ┌────┴────┐                       │       │
│    │                          │ Intent  │                       │       │
│    │                          │ Parse   │                       │       │
│    │                          └────┬────┘                       │       │
│    │                               │                            │       │
│    │                          ┌────┴────┐                       │       │
│    │                          │ Memory  │                       │       │
│    │                          │ Lookup  │                       │       │
│    │                          └────┬────┘                       │       │
│    │                               │                            │       │
│    │                          ┌────┴────┐                       │       │
│    │                          │   LLM   │                       │       │
│    │                          │ Decide  │                       │       │
│    │                          │(~500ms) │                       │       │
│    │                          └────┬────┘                       │       │
│    │                               │                            │       │
│    │  "Sure! I'll build a cozy     │                            │       │
│    │   wooden house right here."   │                            │       │
│    │  ◄────────────────────────────┤                            │       │
│    │                               │                            │       │
│    │                          ┌────┴────┐                       │       │
│    │                          │   TTS   │                       │       │
│    │                          │ (~1s)   │                       │       │
│    │                          └────┬────┘                       │       │
│    │                               │                            │       │
│    │                               │  [Walk to location]        │       │
│    │                               │───────────────────────────►│       │
│    │                               │                            │       │
│    │                               │  [Place blocks]            │       │
│    │                               │───────────────────────────►│       │
│    │                               │                            │       │
│    │  "I'm building the walls      │                            │       │
│    │   now..."                     │                            │       │
│    │  ◄────────────────────────────┤                            │       │
│    │                               │                            │       │
│    │                               │  [Continue building]       │       │
│    │                               │───────────────────────────►│       │
│    │                               │                            │       │
│    │  "All done! What do you       │                            │       │
│    │   think?"                     │                            │       │
│    │  ◄────────────────────────────┤                            │       │
│    │                               │                            │       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Request Processing Pipeline                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Input                                                                  │
│  ─────                                                                  │
│  Voice ──► Whisper ──► Text ──┐                                        │
│  Chat ────────────────────────┼──► [Input Normalizer]                  │
│  Game Event ──────────────────┘         │                               │
│                                         ▼                               │
│                              ┌───────────────────┐                      │
│                              │   Context Builder │                      │
│                              │  ┌─────────────┐  │                      │
│                              │  │ World State │  │                      │
│                              │  │ Agent State │  │                      │
│                              │  │ Memory      │  │                      │
│                              │  │ Personality │  │                      │
│                              │  └─────────────┘  │                      │
│                              └────────┬──────────┘                      │
│                                       │                                 │
│                                       ▼                                 │
│                              ┌───────────────────┐                      │
│                              │  Decision Engine  │                      │
│                              │                   │                      │
│                              │  System 1 ──────► │ Script found?        │
│                              │       │           │      │               │
│                              │       │ No        │      │ Yes           │
│                              │       ▼           │      │               │
│                              │  System 2 ──────► │      │               │
│                              │  (LLM)            │      │               │
│                              │       │           │      │               │
│                              └───────┴───────────┴──────┘               │
│                                       │                                 │
│                                       ▼                                 │
│                              ┌───────────────────┐                      │
│                              │  Action Executor  │                      │
│                              │                   │                      │
│                              │  Validate ──────► │ Valid?               │
│                              │       │           │    │                 │
│                              │       │ No        │    │ Yes             │
│                              │       ▼           │    │                 │
│                              │  Error Handler    │    │                 │
│                              │                   │    │                 │
│                              └───────────────────┴────┘                 │
│                                       │                                 │
│                                       ▼                                 │
│                              ┌───────────────────┐                      │
│                              │  Result Handler   │                      │
│                              │                   │                      │
│                              │  Success ────────►│ Update Memory        │
│                              │                   │ Maybe Cache Script   │
│                              │  Failure ────────►│ Log Error            │
│                              │                   │ Maybe Retry          │
│                              │                   │ Ask for Help         │
│                              └───────────────────┘                      │
│                                       │                                 │
│                                       ▼                                 │
│  Output                                                                │
│  ──────                                                                │
│  Voice ◄── TTS ◄── Text ◄──┐                                          │
│  Chat ◄────────────────────┼──◄ [Response Generator]                   │
│  Game Actions ─────────────┘                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Choices

### 5.1 Core Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Node.js 22+ (TypeScript) | Mineflayer ecosystem, async I/O, ARM64 support |
| **Minecraft Client** | Mineflayer + plugins | Battle-tested, active development, extensible |
| **Pathfinding** | mineflayer-pathfinder | A* with Minecraft-specific costs |
| **Behavior Orchestration** | Custom state machine + BT hybrid | Combines predictability with flexibility |
| **LLM (Local)** | Ollama + Llama 3.2 3B | Jetson-optimized, good quality/speed |
| **LLM (Cloud fallback)** | Claude 3.5 Haiku or GPT-4o-mini | Complex reasoning tasks |
| **Speech-to-Text** | Whisper-tiny.en (faster-whisper) | ARM64 optimized, ~200ms latency |
| **Text-to-Speech** | Piper TTS or Coqui TTS | Local, fast, decent quality |
| **Embeddings** | all-MiniLM-L6-v2 (quantized) | 384-dim, fast inference |
| **Vector Store** | SQLite + sqlite-vss | Simple, embedded, no server |
| **Knowledge Graph** | Custom SQLite-based | Simple relationships, queryable |
| **Script Storage** | SQLite + JavaScript files | Version controlled, editable |
| **Configuration** | YAML + JSON schema | Human-readable, validated |
| **Logging** | Pino (structured JSON) | Fast, stream-friendly |
| **API** | Fastify (HTTP + WebSocket) | Fast, type-safe, good DX |

### 5.2 Jetson Orin Nano Considerations

**Constraints**:
- ARM64 CPU (6 Cortex-A78AE cores)
- 8GB unified memory (CPU + GPU shared)
- 40 TOPS INT8 AI performance

**Optimizations**:
```yaml
# config/jetson.yaml
models:
  llm:
    provider: ollama
    model: llama3.2:3b-instruct-q4_K_M  # 4-bit quantized
    context_window: 4096
    gpu_layers: 32  # Offload all to GPU
    
  stt:
    model: tiny.en  # ~1GB VRAM
    compute_type: int8
    beam_size: 1  # Fastest
    
  tts:
    model: en-us-amy-low  # Piper low-quality model
    noise_scale: 0.5
    
  embeddings:
    model: all-MiniLM-L6-v2
    quantized: true
    
memory:
  vector_cache_mb: 256
  max_episodes: 10000
  
concurrency:
  max_parallel_actions: 3
  llm_timeout_ms: 10000
```

### 5.3 What to Port from MineWright

**Keep/Adapt**:
1. **Script Layer Learning concept**: System 1 / System 2 split
2. **Script cache structure**: Metadata + code separation
3. **Error recovery patterns**: Retry mechanisms

**Rebuild**:
1. **Script generation**: Better prompts, more robust code
2. **Script matching**: Semantic similarity, not exact match
3. **Memory system**: Completely new architecture
4. **Personality**: New module, not in MineWright
5. **Voice**: New layer
6. **World model**: More sophisticated state tracking

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Goal**: Basic working Minecraft bot with LLM control

**Deliverables**:
- [ ] Project scaffolding (TypeScript, linting, CI)
- [ ] Mineflayer integration with basic actions
- [ ] LLM connection (Ollama) with tool calling
- [ ] Basic command parsing ("go to X", "mine Y")
- [ ] Simple logging and debugging

**Milestone**: Bot can follow basic commands via chat

### Phase 2: Script Learning (Weeks 5-8)

**Goal**: System 1 / System 2 learning pipeline

**Deliverables**:
- [ ] Script cache with SQLite storage
- [ ] Script generation prompts
- [ ] Script execution with validation
- [ ] Script promotion criteria
- [ ] Script matching (parameter-based initially)

**Milestone**: Bot learns and reuses common actions

### Phase 3: Memory System (Weeks 9-12)

**Goal**: Persistent multi-session memory

**Deliverables**:
- [ ] Working memory (short-term buffer)
- [ ] Episodic memory (vector storage)
- [ ] Semantic memory (knowledge graph basics)
- [ ] Memory consolidation process
- [ ] Cross-session persistence

**Milestone**: Bot remembers previous sessions

### Phase 4: Personality (Weeks 13-16)

**Goal**: Consistent personality expression

**Deliverables**:
- [ ] Personality trait system
- [ ] Emotion state machine
- [ ] Communication style variation
- [ ] Preference-based decision influence
- [ ] Personality persistence

**Milestone**: Bot has recognizable, consistent character

### Phase 5: Voice (Weeks 17-20)

**Goal**: Natural voice interaction

**Deliverables**:
- [ ] Whisper STT integration
- [ ] Push-to-talk detection
- [ ] Intent parsing from speech
- [ ] TTS integration
- [ ] Emotional voice modulation
- [ ] Response timing optimization

**Milestone**: Full voice conversation capability

### Phase 6: Polish & Edge Cases (Weeks 21-24)

**Goal**: Production-ready, human-like behavior

**Deliverables**:
- [ ] Imperfection injection system
- [ ] Error recovery flows
- [ ] Performance optimization (Jetson)
- [ ] Configuration UI
- [ ] Documentation
- [ ] Testing framework

**Milestone**: Feels like playing with another human

### Phase 7: Advanced Features (Weeks 25+)

**Future enhancements**:
- [ ] Multi-agent coordination
- [ ] Visual understanding (screenshot analysis)
- [ ] Skill sharing between instances
- [ ] Web dashboard
- [ ] Mobile companion app

---

## 7. Known Challenges and Risks

### 7.1 Technical Challenges

#### Latency
**Challenge**: LLM + STT + TTS latency could make interaction feel slow

**Mitigation**:
- Use streaming for TTS (start speaking before full response)
- Parallel processing (STT → LLM while previous TTS finishes)
- System 1 scripts execute instantly
- Smart prediction (anticipate likely responses)

#### Jetson Memory
**Challenge**: 8GB shared memory is tight for LLM + embeddings + game state

**Mitigation**:
- Aggressive model quantization
- Streaming inference (don't load full model at once)
- Offload rarely-used memory to disk
- Careful memory profiling and optimization

#### Minecraft Protocol Limitations
**Challenge**: Protocol doesn't expose all game state

**Mitigation**:
- Supplement with inference (track what we can't see)
- Accept some uncertainty
- Ask player for clarification when needed

#### Script Quality
**Challenge**: LLM-generated scripts may have bugs

**Mitigation**:
- Extensive validation before execution
- Sandbox testing (simulated execution)
- Graceful error recovery
- Human-in-the-loop for critical actions

### 7.2 UX Challenges

#### Annoyance
**Challenge**: Agent could be annoying (talks too much, makes mistakes)

**Mitigation**:
- Configurable verbosity
- Learn player preferences over time
- Non-intrusive notifications
- Easy "quiet mode" toggle

#### Trust
**Challenge**: Player may not trust agent with valuable items/builds

**Mitigation**:
- Graduated autonomy levels
- Preview actions before execution
- Easy rollback/undo
- Ask before risky actions

#### Communication Breakdown
**Challenge**: Misunderstandings between player and agent

**Mitigation**:
- Clarification questions
- Confirmation for ambiguous requests
- Show understanding before acting
- Learn from corrections

### 7.3 Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM API costs too high | Medium | High | Local-first with cloud fallback; script caching |
| Jetson performance insufficient | Low | High | Cloud offload option; model optimization |
| Protocol breaking changes | Low | Medium | Pin Minecraft version; follow Prismarine updates |
| Agent griefs player builds | Medium | High | Restricted zones; confirmation prompts; backup system |
| Player loses interest | Medium | Medium | Personality variety; new skill acquisition; mini-games |
| Memory grows unbounded | Medium | Medium | Forgetting mechanisms; compression; archival |
| Voice recognition poor | Medium | Medium | Fallback to text; push-to-talk; noise filtering |

---

## 8. Academic Contribution Opportunities

### Potential Research Papers

1. **"Personality-Driven Game Agents: Making AI Feel Human"**
   - Focus on personality system and its effects on player experience
   - User study comparing personality variants

2. **"Script Learning for Game AI: A Dual-Process Approach"**
   - Improved MineWright-style system
   - Empirical evaluation of caching effectiveness

3. **"Voice-First Interaction with Game Agents"**
   - UX patterns for voice-controlled NPCs
   - Latency optimization techniques

4. **"Cross-Session Memory for Persistent Game Companions"**
   - Memory architecture for multi-session continuity
   - Evaluation of recall accuracy and relevance

### Datasets to Create

1. **Minecraft Agent Interaction Corpus**: Voice/chat logs with agent
2. **Script Success Dataset**: Scripts tagged with success/failure/conditions
3. **Personality Preference Dataset**: Player ratings of personality variants

---

## 9. Conclusion

CraftMind has the opportunity to create something genuinely novel: a Minecraft AI companion that feels like playing with another person rather than a tool. By combining:

- **Mineflayer's** robust Minecraft protocol implementation
- **MineWright's** dual-process learning architecture
- **Modern LLM agents'** reasoning capabilities
- **Novel contributions** in personality, voice, and memory

We can build an agent that:
- Learns and improves over time
- Remembers and references past experiences
- Communicates naturally via voice
- Has consistent, recognizable personality
- Makes human-like mistakes and recovers gracefully

The technical foundation is sound, the roadmap is achievable, and the end result would be a unique contribution to both game AI and human-AI interaction research.

---

## Appendix A: Key References

### Papers
1. Wang et al. "Voyager: An Open-Ended Agent with Large Language Models" (2023)
2. Fan et al. "MineDojo: Building Open-Ended Embodied Agents with Internet-Scale Knowledge" (2022)
3. Kahneman "Thinking, Fast and Slow" (2011) - System 1/System 2 foundation

### Projects
- Voyager: https://github.com/MineDojo/Voyager
- MineWright: https://github.com/superinstance/minewright
- Mineflayer: https://github.com/PrismarineJS/mineflayer
- MemGPT: https://github.com/cpacker/memgpt
- Mem0: https://github.com/mem0ai/mem0
- Whisper: https://github.com/openai/whisper

### Resources
- MineDojo: https://minedojo.org
- PrismarineJS: https://prismarine.js.org
- LangChain: https://docs.langchain.com

---

*Document Version: 1.0*
*Created: 2026-03-25*
*Author: CraftMind Research Subagent*
