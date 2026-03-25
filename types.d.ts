/**
 * @file CraftMind Core Type Definitions
 * @description TypeScript/JSDoc type definitions for the public API.
 * Enable IDE autocomplete by referencing this file.
 *
 * @example
 * /// <reference path="node_modules/craftmind/types.d.ts" />
 * import { createBot, CraftMindBot } from 'craftmind';
 */

import type { Bot } from 'mineflayer';

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface CraftMindConfig {
  host?: string;
  port?: number;
  version?: string;
  username?: string;
  personality?: string;
  useBrain?: boolean;
  memoryDir?: string;
  plugins?: PluginDef[];

  llm?: {
    apiKey?: string;
    model?: string;
    apiUrl?: string;
    maxHistory?: number;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    minInterval?: number;
  };

  behavior?: {
    autoEat?: boolean;
    autoEatThreshold?: number;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    fleeHealth?: number;
    fleeOnLava?: boolean;
  };

  pathfinding?: {
    allowSprinting?: boolean;
    allowParkour?: boolean;
    defaultFollowDistance?: number;
  };

  onStart?(bot: CraftMindBot): void;
  onChat?(bot: CraftMindBot, username: string, message: string): void;
  onEnd?(bot: CraftMindBot): void;
}

// ─── Bot ───────────────────────────────────────────────────────────────────────

export interface CraftMindBot extends Bot {
  craftmind: BotActions;
}

export interface BotActions {
  followPlayer(playerName: string, distance?: number): void;
  stop(): void;
  goTo(x: number, y: number, z: number): void;
  say(message: string): void;
  findBlock(blockType: number | string | ((block: any) => boolean), range?: number): any[];
  inventorySummary(): Record<string, number>;
  position(): { x: number; y: number; z: number };
  nearbyEntities(range?: number): Array<{ name: string; type: string; distance: number }>;
  lookAt(playerName: string): void;
  dig(x: number, y: number, z: number): void;
  place(blockName: string, x: number, y: number, z: number): void;

  // System access
  _events: CraftMindEvents;
  _stateMachine: BotStateMachine;
  _commands: CommandRegistry;
  _plugins: PluginManager;
  _memory: BotMemory;
  _config: ReturnType<typeof loadConfig>;
  _logger: Logger;
}

// ─── State Machine ─────────────────────────────────────────────────────────────

export type BotState =
  | 'IDLE'
  | 'FOLLOWING'
  | 'MINING'
  | 'BUILDING'
  | 'COMBAT'
  | 'FLEEING'
  | 'NAVIGATING'
  | 'DEAD';

export interface StateConfig {
  name: BotState;
  onEnter?: (from: string, context?: any) => void;
  onExit?: (to: string, context?: any) => void;
  guard?: (from: string, to: string) => boolean;
}

export interface BotStateMachine {
  readonly current: BotState;
  readonly elapsed: number;
  static STATES: ReadonlyArray<BotState>;
  configure(name: BotState, config: Partial<StateConfig>): void;
  transition(to: BotState, context?: any): boolean;
  canTransition(to: BotState): boolean;
  onStateChange(fn: (from: BotState, to: BotState, context?: any) => void): () => void;
  meta(key: string, value?: any): any;
  reset(): void;
}

// ─── Events ────────────────────────────────────────────────────────────────────

export interface CraftMindEvents {
  on(event: string, handler: (...args: any[]) => void): () => void;
  once(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  removeAll(event?: string): void;
  static Events: {
    readonly SPAWN: 'spawn';
    readonly DEATH: 'death';
    readonly HEALTH: 'health';
    readonly KICKED: 'kicked';
    readonly ERROR: 'error';
    readonly DISCONNECT: 'disconnect';
    readonly RECONNECT: 'reconnect';
    readonly CHAT: 'chat';
    readonly COMMAND: 'command';
    readonly STATE_CHANGE: 'stateChange';
    readonly INVENTORY_CHANGE: 'inventoryChange';
    readonly BLOCK_FOUND: 'blockFound';
    readonly CHUNK_LOADED: 'chunkLoaded';
    readonly PLAYER_SEEN: 'playerSeen';
    readonly FOLLOW_START: 'followStart';
    readonly FOLLOW_STOP: 'followStop';
    readonly NAVIGATION_START: 'navigationStart';
    readonly NAVIGATION_COMPLETE: 'navigationComplete';
    readonly NAVIGATION_FAILED: 'navigationFailed';
    readonly DIG_START: 'digStart';
    readonly DIG_COMPLETE: 'digComplete';
    readonly PLACE_BLOCK: 'placeBlock';
  };
}

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface CommandDef {
  name: string;
  description?: string;
  usage?: string;
  permission?: 'anyone' | 'op';
  aliases?: string[];
  execute(ctx: CommandContext, ...args: string[]): void;
}

export interface CommandContext {
  bot: CraftMindBot;
  sender: string;
  raw: string;
  reply(msg: string): void;
  permission: 'anyone' | 'op';
}

export interface CommandRegistry {
  register(def: CommandDef): void;
  unregister(name: string): void;
  execute(input: string, ctx: CommandContext): boolean;
  help(name?: string): string;
  readonly names: string[];
}

// ─── Plugins ───────────────────────────────────────────────────────────────────

export interface PluginDef {
  name: string;
  version?: string;
  description?: string;
  init(ctx: PluginContext): void;
  destroy?(ctx: PluginContext): void;
}

export interface PluginContext {
  bot: CraftMindBot;
  events: CraftMindEvents;
  commands: CommandRegistry;
  config: any;
  logger: Logger;
}

export interface PluginManager {
  load(plugin: PluginDef, events: CraftMindEvents, commands: CommandRegistry, bot: CraftMindBot): boolean;
  unload(name: string): void;
  unloadAll(): void;
  readonly loaded: string[];
}

// ─── Memory ────────────────────────────────────────────────────────────────────

export interface PlayerRecord {
  firstMet: string;
  lastSeen: string;
  interactions: number;
  [key: string]: any;
}

export interface MemoryData {
  players: Record<string, PlayerRecord>;
  places: Record<string, any>;
  builds: Record<string, any>;
  resources: Record<string, { totalFound: number; locations: any[] }>;
  deaths: number;
  deathCauses: Array<{ cause: string; timestamp: string }>;
  meta: Record<string, any>;
  lastSession: string | null;
}

export interface BotMemory {
  readonly data: MemoryData;
  rememberPlayer(name: string, info?: Partial<PlayerRecord>): void;
  getPlayer(name: string): PlayerRecord | undefined;
  readonly knownPlayers: Record<string, PlayerRecord>;
  rememberPlace(name: string, info: any): void;
  getPlace(name: string): any;
  readonly knownPlaces: Record<string, any>;
  rememberBuild(name: string, info: any): void;
  readonly knownBuilds: Record<string, any>;
  recordResource(type: string, location: any, count?: number): void;
  recordDeath(cause?: string): void;
  setMeta(key: string, value: any): void;
  getMeta(key: string): any;
  save(): void;
}

// ─── Brain ─────────────────────────────────────────────────────────────────────

export interface PersonalityDef {
  name: string;
  traits: string;
  speech: string;
  background: string;
  quirks: string;
  systemPrompt: string;
}

export interface LLMClient {
  apiKey: string;
  model: string;
  apiUrl: string;
  history: Array<{ role: string; content: string }>;
  maxHistory: number;
  systemPrompt: string;
  setSystemPrompt(prompt: string): void;
  chat(userMessage: string, context?: any): Promise<string | null>;
  clearHistory(): void;
}

export interface BrainHandler {
  bot: any;
  personality: PersonalityDef;
  llm: LLMClient;
  thinking: boolean;
  handleChat(username: string, message: string): Promise<void>;
  autonomousThought(): Promise<string | undefined>;
}

// ─── Logging ───────────────────────────────────────────────────────────────────

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'silent'): void;
  addTransport(fn: (entry: LogEntry) => void): void;
  clearTransports(): void;
  create(source: string): Logger;
  levels: Record<string, number>;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string | null;
  message: string;
  data?: any;
}

// ─── Module Exports ────────────────────────────────────────────────────────────

export function createBot(options?: CraftMindConfig): CraftMindBot;
export const PERSONALITIES: Record<string, PersonalityDef>;
export function loadConfig(runtimeOpts?: any): any;
export function validateConfig(config: any): { valid: boolean; errors: string[] };

// Orchestrator
export class Orchestrator {
  agents: Map<string, BotAgent>;
  serverHost: string;
  serverPort: number;
  addAgent(name: string, personality?: any): BotAgent;
  removeAgent(name: string): void;
  resolveName(partial: string): string | null;
  commandAll(action: string, ...args: any[]): void;
  getTeamStatus(): any[];
  startAll(): Promise<void>;
  startCLI(): void;
}

export class BotAgent {
  name: string;
  config: any;
  bot: CraftMindBot | null;
  alive: boolean;
  status: 'idle' | 'following' | 'mining' | 'building' | 'fighting' | 'moving';
  target: string | null;
  start(serverHost: string, serverPort: number): Promise<void>;
  command(action: string, ...args: any[]): boolean;
  getStatus(): any;
  handleChat(username: string, message: string): void;
}
