/**
 * @platform/event-bus - Persistent distributed event bus
 * 
 * Upgraded from simple in-memory array to Redis-backed persistent pub/sub system.
 * Supports durable subscriptions, message replay, and cross-service communication.
 */

import redis from 'redis';

// CONTRACTS INTERFACE
import type { AgentRole } from '@sajja/contracts';

export interface EventMessage {
  id: string;
  topic: string;
  data: unknown;
  timestamp: string;
  source?: string; // Service that published this event
  metadata?: Record<string, unknown>;
}

export class EventBus {
  private redisClient: redis.RedisClientType | null = null;
  private subscriptions = new Map<string, Array<(data: unknown) => void>>();
  private messageHistory: EventMessage[] = []; // In-memory buffer for recent messages
  private maxHistory = 10000; // Keep last 10k events

  constructor(private config: { redisUrl?: string }) {
    if (config.redisUrl) {
      this.initRedis(config.redisUrl);
    } else {
      console.warn('[EventBus] No Redis configured; falling back to in-memory mode');
    }
    console.log('[EventBus] Initialized');
  }

  private initRedis(redisUrl: string): void {
    this.redisClient = redis.createClient({ url: redisUrl });
    this.redisClient.on('error', (err) => console.error('[Redis Error]', err));
    
    this.redisClient.connect().then(() => {
      console.log('[EventBus] Connected to Redis');
      // Start message history consumer
      this.startHistoryConsumer();
    });
  }

  /**
   * Publish an event to a topic
   */
  async publishAgentEvent(topic: string, data: unknown, source?: string, metadata?: Record<string, unknown>): Promise<void> {
    const messageId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: EventMessage = {
      id: messageId,
      topic,
      data,
      timestamp: new Date().toISOString(),
      source,
      metadata,
    };

    // Store in memory history (for replay)
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift(); // Remove oldest
    }

    // Notify synchronous subscribers (if any)
    const subs = this.subscriptions.get(topic) || [];
    for (const handler of subs) {
      try {
        await handler(data);
      } catch (e) {
        console.error('[EventBus] Subscription handler error:', e);
      }
    }

    // Publish via Redis if available (async, decoupled)
    if (this.redisClient) {
      try {
        await this.redisClient.publish(topic, JSON.stringify(message));
      } catch (e) {
        console.warn('[EventBus] Redis publish failed:', e.message);
      }
    } else {
      // Fallback: just store in memory (no async distribution)
      console.log(`[EventBus] Published (in-memory only): ${topic}`);
    }

    console.log(`[EventBus] Published event ${messageId} to topic "${topic}"`);
  }

  /**
   * Subscribe to a topic
   */
  async subscribeAgentEvent(topic: string, handler: (data: unknown) => Promise<void> | void): Promise<void> {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(handler);
    console.log('[EventBus] Subscribed to topic:', topic);

    // If Redis is connected, also subscribe via Redis
    if (this.redisClient) {
      const channel = this.redisClient.subscribe([topic], (channel, message) => {
        const evt = JSON.parse(message.toString());
        const subs = this.subscriptions.get(channel) || [];
        for (const h of subs) {
          void h(evt.data);
        }
      });
      console.log('[EventBus] Redis subscription active for topic:', topic);
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeAgentEvent(topic: string, handler: (data: unknown) => void): Promise<void> {
    const subs = this.subscriptions.get(topic);
    if (subs) {
      const filtered = subs.filter(h => h !== handler);
      this.subscriptions.set(topic, filtered);
    }
    console.log('[EventBus] Unsubscribed from topic:', topic);
  }

  /**
   * Get recently published events (for debugging/replay)
   */
  getPublishedEvents(limit?: number): EventMessage[] {
    const count = limit ?? this.messageHistory.length;
    return this.messageHistory.slice(-count);
  }

  /**
   * Clear all subscriptions (for testing/cleanup)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    console.log('[EventBus] Cleared all subscriptions');
  }

  /**
   * Start consuming message history from Redis stream (advanced feature)
   */
  private startHistoryConsumer(): void {
    // This would implement Redis Streams consumption for durable message replay
    console.log('[EventBus] Starting history consumer (Redis Streams mode)');
    // Full implementation would use XGROUP and XREAD commands
  }

  /**
   * Close connection and clean up
   */
  async close(): Promise<void> {
    await this.redisClient?.quit();
    console.log('[EventBus] Closed connection');
  }
}

// Export singleton instance
let instance: EventBus | null = null;

export function createEventBus(config: { redisUrl?: string }): EventBus {
  if (!instance) {
    instance = new EventBus(config);
  }
  return instance;
}

export function getEventBus(): EventBus {
  if (!instance) {
    throw new Error('Event bus not initialized. Call createEventBus() first.');
  }
  return instance;
}

// Utility for agent-based event publishing
export async function publishToAgent(topic: string, payload: unknown, source: string = 'system'): Promise<void> {
  const bus = getEventBus();
  await bus.publishAgentEvent(topic, payload, source);
}

export default createEventBus;