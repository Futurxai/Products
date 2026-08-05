import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { NetworkStatusService } from '@core/network/network-status.service';
import { OfflineBannerComponent } from './offline-banner.component';

describe('OfflineBannerComponent', () => {
  function createWithOnlineState(isOnline: boolean) {
    TestBed.configureTestingModule({
      providers: [{ provide: NetworkStatusService, useValue: { isOnline: signal(isOnline).asReadonly() } }],
    });
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing while online', () => {
    const fixture = createWithOnlineState(true);
    expect(fixture.nativeElement.querySelector('.app-offline-banner')).toBeNull();
  });

  it('renders an accessible status banner while offline', () => {
    const fixture = createWithOnlineState(false);
    const banner = fixture.nativeElement.querySelector('.app-offline-banner');

    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(banner.textContent).toContain("You're offline");
  });
});
