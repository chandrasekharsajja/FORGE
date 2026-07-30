/**
 * @core-agent/streaming - Real-time LLM response streaming infrastructure
 * 
 * Provides streaming support for agent responses using Server-Sent Events (SSE)
 and WebSocket protocols, with backpressure handling and partial content buffering.
 */

import { Readable } from 'stream';

// CONTRACTS
import type { AIMessage } from '@langchain/core/messages';
import type { StreamingAgentResponse } from '@sajja/contracts';

export interface StreamOptions {
  maxBufferSize?: number;          // Max bytes to buffer before flushing
  timeoutMs?: number;              // Per-chunk timeout
  includeMetadata?: boolean;       // Include metadata with each chunk
  onProgress?: (chunk: unknown) => void; // Optional callback for progress tracking
}

export class StreamingAgent {
  private options: Required<Omit<StreamOptions, 'onProgress'>>;

  constructor(defaultOptions: Partial<StreamOptions> = {}) {
    this.options = {
      maxBufferSize: 4096,
      timeoutMs: 30000,
      includeMetadata: true,
      ...defaultOptions,
    };
  }

  /**
   * Stream LLM response as chunks to client via SSE
   * This would be used in a Next.js API route handler
   */
  async streamToSSE(
    llmCall: () => Promise<AIMessage>,
    request: Request,
    context: Record<string, unknown>
  ): Promise<Response> {
    // Set SSE headers
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    };

    return new Response(this.streamChunks(llmCall, context), {
      headers,
      status: 200,
    });
  }

  /**
   * Internal implementation that yields stream chunks
   */
  private async* streamChunks(
    llmCall: () => Promise<AIMessage>,
    context: Record<string, unknown>
  ): AsyncIterable<string> {
    let totalBytes = 0;
    let startTime = Date.now();

    try {
      // Initial event
      yield this.formatEvent('start', { timestamp: new Date().toISOString(), context });

      // Get the full LLM response
      const message = await llmCall();

      // Stream content in chunks (simulated splitting by words/sentences)
      const content = message.content || '';
      const chunkSize = Math.max(1, Math.floor(content.length / Math.min(50, content.length / 100))); // Aim for ~50 chunks
      
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.substr(i, chunkSize);
        
        // Check timeout
        if (this.options.timeoutMs && (Date.now() - startTime) > this.options.timeoutMs) {
          throw new Error('Streaming timeout exceeded');
        }

        // Buffer size check
        totalBytes += chunk.length + 50; // Overhead estimate
        if (totalBytes > this.options.maxBufferSize) {
          // Flush or slow down based on backpressure strategy
          await new Promise(resolve => setTimeout(resolve, 10)); // Simple backpressure
          totalBytes = 0;
        }

        const event = {
          chunk,
          position: i,
          total: content.length,
          timestamp: new Date().toISOString(),
          ...(this.options.includeMetadata ? { metadata: { role: 'agent', source: 'core-agent' } } : {}),
        };

        yield this.formatEvent('data', event);
      }

      // Final completion event
      yield this.formatEvent('complete', {
        finalContent: message.content,
        tokenCount: message?.getFormattedTokenCount?.() || 0,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      // Error event
      const errMessage = error instanceof Error ? error.message : String(error);
      yield thisformat('error', {
        message: errMessage,
        timestamp: new Date().toISOString(),
      });
      throw error; // Re-throw for client to handle
    }
  }

  /** Format event for SSE protocol */
  private formatEvent(type: string, data: unknown): string {
    const jsonStr = JSON.stringify(data);
    return `data: ${jsonStr}\n\n`;
  }

  /**
   * Stream response using WebSockets (alternative to SSE)
   * Would be implemented in a separate WebSocket server layer
   */
  async streamToWebSocket(ws: WebSocket, llmCall: () => Promise<AIMessage>): Promise<void> {
    ws.onopen = async () => {
      try {
        const message = await llmCall();
        
        // Send initial message
        await ws.send(JSON.stringify({
          type: 'stream_start',
          timestamp: new Date().toISOString(),
        }));

        // Stream chunks
        const content = message.content || '';
        for (let i = 0; i < content.length; i += 50) {
          const chunk = content.substr(i, 50);
          await ws.send(JSON.stringify({
            type: 'stream_chunk',
            chunk,
            position: i,
            total: content.length,
          }));
          
          // Small delay for realism
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Final
        await ws.send(JSON.stringify({
          type: 'stream_complete',
          finalContent: message.content,
        }));

      } catch (error) {
        ws.send(JSON.stringify({
          type: 'stream_error',
          message: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        ws.close();
      }
    };
  }

  /** Create readable stream for Node.js consumers */
  createNodeReadableStream(llmCall: () => Promise<AIMessage>): Readable {
    const stream = new Readable({
      highWaterMark: 16 * 1024, // 16KB buffer
      objectMode: false,
    });

    let isFirst = true;
    llmCall()
      .then(async (message) => {
        const content = message.content || '';
        
        stream.push(`{ "type": "start", "timestamp": "${new Date().toISOString()}" }\n`);
        
        // Stream in chunks
        for (let i = 0; i < content.length; i += 100) {
          const chunk = content.substr(i, 100);
          stream.push(`{ "type": "chunk", "position": ${i}, "chunk": "${JSON.stringify(chunk)}" }\n`);
          
          if (!stream.readableFlowing) {
            // Backpressure - wait if not reading
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        stream.push(`{ "type": "complete", "finalContent": "${JSON.stringify(content)}" }\n`);
        stream.push(null); // End of stream
      })
      .catch((err) => {
        stream.push(`{ "type": "error", "message": "${JSON.stringify(err.message || String(err))}" }\n`);
        stream.err = err;
        stream.push(null);
      });

    return stream;
  }
}

// Export singleton with default configuration
let streamingAgent: StreamingAgent | null = null;

export function createStreamingAgent(options?: Partial<StreamOptions>): StreamingAgent {
  if (!streamingAgent) {
    streamingAgent = new StreamingAgent(options || {});
  }
  return streamingAgent;
}

export function getStreamingAgent(): StreamingAgent {
  if (!streamingAgent) {
    throw new Error('Streaming agent not initialized. Call createStreamingAgent() first.');
  }
  return streamingAgent;
}

// Utility hook for React Server Components to enable streaming
export function useStreamingAgent(): StreamingAgent {
  // This would be used in Next.js server components
  // In practice, we'd need proper integration with React Server Streams
  return getStreamingAgent();
}

export default createStreamingAgent;