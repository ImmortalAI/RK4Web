// Example of type realization that can be used in TypedEventEmitter as template
// type EventMap = {
//   userLogin: { username: string; id: number };
//   userLogout: void;
//   dataUpdate: { id: string; payload: any };
// };
//
// const emitter = new TypedEventEmitter<EventMap>();

type Listener<T> = T extends void ? () => void : (payload: T) => void;

export class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners: {
    [K in keyof Events]?: Set<Listener<Events[K]>>;
  } = {};

  /**
   * Registers a listener for the specified event.
   *
   * @param event - The event name to listen for.
   * @param listener - The callback function to invoke when the event is emitted.
   * @returns A function to remove the registered listener.
   */
  public on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);

    return () => this.off(event, listener);
  }

  /**
   * Removes a registered listener for the specified event.
   *
   * @param event - The event name to remove the listener from.
   * @param listener - The callback function to remove.
   * @internal
   */
  protected off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  /**
   * Emits an event with the provided payload.
   *
   * @param event - The event name to emit.
   * @param payload - The payload to emit with the event.
   * @internal
   */
  protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => {
      (listener as any)(payload);
    });
  }

  /**
   * Clears all listeners for the specified event.
   *
   * @param event - The event name to clear listeners for.
   * @internal
   */
  protected clear<K extends keyof Events>(event: K): void {
    this.listeners[event]?.clear();
  }

  /**
   * Clears all listeners for all events.
   *
   * @internal
   */
  protected clearAll(): void {
    for (const key in this.listeners) {
      this.listeners[key]?.clear();
    }
  }
}
