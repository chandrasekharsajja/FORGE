export class EventBus {
  async publishAgentEvent(topic: string, data: any): Promise<void> {
    console.log(`[NATS Event Bus] Publishing event to topic '${topic}'...`);
  }

  async subscribeAgentEvent(topic: string, handler: (data: any) => void): Promise<void> {
    console.log(`[NATS Event Bus] Subscribed to topic '${topic}'.`);
  }
}
