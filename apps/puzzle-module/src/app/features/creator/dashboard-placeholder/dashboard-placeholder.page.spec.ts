import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { AuthFacade } from '@application/creator/auth.facade';
import { Creator } from '@domain/models/creator.model';

import { DashboardPlaceholderPage } from './dashboard-placeholder.page';

describe('DashboardPlaceholderPage', () => {
  let fixture: ComponentFixture<DashboardPlaceholderPage>;
  let logOut: jasmine.Spy;
  let router: Router;

  const creator: Creator = {
    creatorId: 'uid_1',
    displayName: 'Vikram Rao',
    email: 'vikram.rao@example.com',
    phone: null,
    avatarUrl: null,
    signupMethod: 'email',
    createdAt: new Date('2026-01-04T09:12:00+05:30'),
  };

  beforeEach(() => {
    logOut = jasmine.createSpy('logOut').and.resolveTo();

    TestBed.configureTestingModule({
      imports: [DashboardPlaceholderPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: { currentCreator: signal<Creator | null>(creator), logOut },
        },
      ],
    });

    fixture = TestBed.createComponent(DashboardPlaceholderPage);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('renders the signed-in creator’s name and email', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vikram Rao');
    expect(text).toContain('vikram.rao@example.com');
  });

  it('logOut() signs out and redirects to /auth/login', async () => {
    fixture.detectChanges();
    await fixture.componentInstance['logOut']();

    expect(logOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
