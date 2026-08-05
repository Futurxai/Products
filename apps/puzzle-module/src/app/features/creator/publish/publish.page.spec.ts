import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { PublishExperienceFacade, PublishErrorKind } from '@application/creator/publish-experience.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { PublishExperienceSuccess } from '@domain/ports/puzzle-api.port';
import { ValidationResult } from '@domain/rules/lifecycle.rules';

import { PublishPage } from './publish.page';

describe('PublishPage', () => {
  let fixture: ComponentFixture<PublishPage>;
  let page: PublishPage;
  let router: Router;
  let start: jasmine.Spy;
  let publish: jasmine.Spy;
  let experience: ReturnType<typeof signal<PuzzleExperience | null>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let validation: ReturnType<typeof signal<ValidationResult | null>>;
  let publishing: ReturnType<typeof signal<boolean>>;
  let publishResult: ReturnType<typeof signal<PublishExperienceSuccess | null>>;
  let error: ReturnType<typeof signal<string | null>>;
  let errorKind: ReturnType<typeof signal<PublishErrorKind | null>>;

  function configure(paramMapValues: Record<string, string>): void {
    TestBed.resetTestingModule();

    start = jasmine.createSpy('start').and.resolveTo();
    publish = jasmine.createSpy('publish').and.resolveTo();
    experience = signal<PuzzleExperience | null>(null);
    loading = signal(false);
    validation = signal<ValidationResult | null>(null);
    publishing = signal(false);
    publishResult = signal<PublishExperienceSuccess | null>(null);
    error = signal<string | null>(null);
    errorKind = signal<PublishErrorKind | null>(null);

    TestBed.configureTestingModule({
      imports: [PublishPage],
      providers: [
        provideRouter([]),
        {
          provide: PublishExperienceFacade,
          useValue: { experience, loading, validation, publishing, publishResult, error, errorKind, start, publish },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(paramMapValues) } } },
      ],
    });

    fixture = TestBed.createComponent(PublishPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  }

  it('starts the publish flow for the routed experienceId', async () => {
    configure({ experienceId: 'exp_1' });
    await page.ngOnInit();
    expect(start).toHaveBeenCalledWith('exp_1');
  });

  it('redirects to the dashboard when no experienceId param is present', async () => {
    configure({});
    await page.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
    expect(start).not.toHaveBeenCalled();
  });

  it('shows the loader while loading', () => {
    configure({ experienceId: 'exp_1' });
    loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loader')).not.toBeNull();
  });

  it('shows "Publishing your puzzle…" while the Cloud Function call is in flight', () => {
    configure({ experienceId: 'exp_1' });
    loading.set(true);
    publishing.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Publishing your puzzle');
  });

  it('shows friendly validation messages and never renders the share panel when invalid', () => {
    configure({ experienceId: 'exp_1' });
    validation.set({ ok: false, missingFields: ['revealImage', 'questions.q1.prompt'] });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Upload a reveal photo.');
    expect(text).toContain('Question 1 is missing its question text.');
    expect(fixture.nativeElement.querySelector('app-share-panel')).toBeNull();
  });

  it('backToWizard navigates to the experience\'s Wizard route', async () => {
    configure({ experienceId: 'exp_1' });
    experience.set(draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }));

    await page['backToWizard']();

    expect(router.navigate).toHaveBeenCalledWith(['/creator/wizard', 'exp_1']);
  });

  it('shows the Share screen once publishResult is set', () => {
    configure({ experienceId: 'exp_1' });
    publishResult.set({ ok: true, shareToken: 'pzl_abc', shareUrl: 'https://x/e/pzl_abc', status: 'published' });
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('app-share-panel');
    expect(panel).not.toBeNull();
  });

  it('shows a business error with a "Go to Dashboard" action and no Retry button', () => {
    configure({ experienceId: 'exp_1' });
    validation.set({ ok: true, missingFields: [] });
    error.set('Only the creator of this experience can publish it.');
    errorKind.set('business');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Only the creator of this experience can publish it.');
    expect(text).not.toContain('Retry');
  });

  it('shows an infra error with a Retry button that calls publish() again', () => {
    configure({ experienceId: 'exp_1' });
    validation.set({ ok: true, missingFields: [] });
    error.set("Couldn't reach the server. Check your connection and try again.");
    errorKind.set('infra');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Retry');

    page['retry']();
    expect(publish).toHaveBeenCalled();
  });

  it('shows a not_found error even when validation is still null', () => {
    configure({ experienceId: 'missing' });
    error.set('This puzzle could not be found.');
    errorKind.set('not_found');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This puzzle could not be found.');
  });
});
