import { WEBSOCKET_MAX_RETRIES, WEBSOCKET_RECONNECT_DELAY } from '../../utils/constants';

export class ReconnectManager {
  private retryCount = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(callback: () => void): boolean {
    if (this.retryCount >= WEBSOCKET_MAX_RETRIES) return false;
    this.retryCount++;
    const backoff = WEBSOCKET_RECONNECT_DELAY * this.retryCount;
    this.timer = setTimeout(callback, backoff);
    return true;
  }

  reset(): void {
    this.retryCount = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get attempts(): number {
    return this.retryCount;
  }
}
