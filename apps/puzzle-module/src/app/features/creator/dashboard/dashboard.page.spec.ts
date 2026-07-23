import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { AuthFacade } from '@application/creator/auth.facade';
import { CreatorDashboardFacade } from '@application/creator/creator-dashboard.facade';
import { Creator } from '@domain/models/creator.model';
import { DashboardGroups, DashboardSummary } from '@domain/rules/dashboard.rules';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { ToastService } from '@shared/toast/toast.service';

import { DashboardPage } from './dashboard.page';

const creator: Creator = {
  creatorId: 'cre_001',
  displayName: 'Vikram Rao',
  email: 'vikram.rao@example.com',
  phone: null,
  avatarUrl: null,
  signupMethod: 'email',
  createdAt: new Date('2026-01-04T09:12:00+05:30'),
};

const emptyGroups: DashboardGroups = { drafts: [], published: [], completed: [] };
const emptySummary: DashboardSummary = { totalCount: 0, draftCount: 0, publishedCount: 0, completedCount: 0 };

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let page: DashboardPage;
  let load: jasmine.Spy;
  let refresh: jasmine.Spy;
  let logOut: jasmine.Spy;
  let loading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;
  let isEmpty: ReturnType<typeof signal<boolean>>;
  let groups: ReturnType<typeof signal<DashboardGroups>>;
  let summary: ReturnType<typeof signal<DashboardSummary>>;
  let router: Router;
  let toast: ToastService;

  beforeEach(() => {
    load = jasmine.createSpy('load').and.resolveTo();
    refresh = jasmine.createSpy('refresh').and.resolveTo();
    logOut = jasmine.createSpy('logOut').and.resolveTo();
    loading = signal(false);
    error = signal<string | null>(null);
    isEmpty = signal(false);
    groups = signal(emptyGroups);
    summary = signal(emptySummary);

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { currentCreator: signal<Creator | null>(creator), logOut } },
        {
          provide: CreatorDashboardFacade,
          useValue: { loading, error, isEmpty, groups, summary, load, refresh },
        },
      ],
    });

    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toast, 'show');
  });

  it('calls dashboardFacade.load() on init', () => {
    fixture.detectChanges();
    expect(load).toHaveBeenCalled();
  });

  it('renders the welcome message with the signed-in creator’s name', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Welcome back, Vikram Rao');
  });

  it('shows the loader while loading', () => {
    loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loader')).not.toBeNull();
  });

  it('shows the error state with a retry action, and retry() calls refresh()', async () => {
    error.set('Could not load your puzzles. Please try again.');
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.dashboard-page__error');
    expect(errorEl.textContent).toContain('Could not load your puzzles');

    await page['retry']();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the empty state when isEmpty is true', () => {
    isEmpty.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
  });

  it('renders the analytics summary and grouped sections when data is present', () => {
    const draft: PuzzleExperience = draftExperience({
      experienceId: 'exp_1',
      creatorId: 'cre_001',
      occasion: 'Anniversary',
      recipientDisplayName: 'Ananya',
    });
    groups.set({ drafts: [draft], published: [], completed: [] });
    summary.set({ totalCount: 1, draftCount: 1, publishedCount: 0, completedCount: 0 });

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Analytics Summary');
    expect(text).toContain('Draft Puzzles');
    expect(fixture.nativeElement.querySelectorAll('app-experience-card').length).toBe(1);
  });

  it('createNewPuzzle() shows an informational toast instead of navigating anywhere', () => {
    fixture.detectChanges();
    page['createNewPuzzle']();
    expect(toast.show).toHaveBeenCalledWith('The Puzzle Creation Wizard arrives in the next feature.', 'info');
  });

  it('logOut() signs out and redirects to /auth/login', async () => {
    fixture.detectChanges();
    await page['logOut']();

    expect(logOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
