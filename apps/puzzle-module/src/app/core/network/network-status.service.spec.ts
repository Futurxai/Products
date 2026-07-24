import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  it('starts reflecting navigator.onLine', () => {
    const service = new NetworkStatusService();
    expect(service.isOnline()).toBe(navigator.onLine);
  });

  it('flips to false when the browser fires an "offline" event', () => {
    const service = new NetworkStatusService();

    window.dispatchEvent(new Event('offline'));

    expect(service.isOnline()).toBeFalse();
  });

  it('flips back to true when the browser fires an "online" event', () => {
    const service = new NetworkStatusService();
    window.dispatchEvent(new Event('offline'));

    window.dispatchEvent(new Event('online'));

    expect(service.isOnline()).toBeTrue();
  });
});
