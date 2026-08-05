import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ToastService } from '@shared/toast/toast.service';

import { SharePanelComponent } from './share-panel.component';

describe('SharePanelComponent', () => {
  let fixture: ComponentFixture<SharePanelComponent>;
  let router: Router;
  let toast: ToastService;
  let originalShare: typeof navigator.share | undefined;

  function render(): void {
    fixture = TestBed.createComponent(SharePanelComponent);
    fixture.componentRef.setInput('shareUrl', 'https://puzzle.lovedigitally.app/e/pzl_abc123');
    fixture.componentRef.setInput('experienceId', 'exp_1');
    fixture.detectChanges();
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  }

  beforeEach(() => {
    originalShare = navigator.share;
    TestBed.configureTestingModule({ imports: [SharePanelComponent], providers: [provideRouter([])] });
  });

  afterEach(() => {
    if (originalShare) {
      navigator.share = originalShare;
    } else {
      delete (navigator as { share?: unknown }).share;
    }
  });

  it('renders the share URL and QR code', () => {
    render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('https://puzzle.lovedigitally.app/e/pzl_abc123');
    expect(fixture.nativeElement.querySelector('app-qr-code')).not.toBeNull();
  });

  it('copyLink copies the share URL and shows a success toast', async () => {
    render();
    spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    spyOn(toast, 'success');

    await fixture.componentInstance['copyLink']();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://puzzle.lovedigitally.app/e/pzl_abc123');
    expect(toast.success).toHaveBeenCalledWith('Link copied!');
  });

  it('copyLink shows an error toast if the clipboard write fails', async () => {
    render();
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));
    spyOn(toast, 'error');

    await fixture.componentInstance['copyLink']();

    expect(toast.error).toHaveBeenCalled();
  });

  it('builds a WhatsApp share link containing the encoded share URL', () => {
    render();
    expect(fixture.componentInstance['whatsappShareUrl']()).toContain(encodeURIComponent('https://puzzle.lovedigitally.app/e/pzl_abc123'));
  });

  it('hides the native share button when navigator.share is unavailable', () => {
    delete (navigator as { share?: unknown }).share;
    render();
    expect(fixture.nativeElement.textContent).not.toContain('Share…');
  });

  it('shows and invokes the native share button when navigator.share is available', async () => {
    const shareSpy = jasmine.createSpy('share').and.resolveTo();
    navigator.share = shareSpy;
    render();

    expect(fixture.nativeElement.textContent).toContain('Share…');

    await fixture.componentInstance['nativeShare']();
    expect(shareSpy).toHaveBeenCalledWith({ title: 'A puzzle made just for you', url: 'https://puzzle.lovedigitally.app/e/pzl_abc123' });
  });

  it('previewAsRecipient navigates to the existing Preview route', async () => {
    render();
    await fixture.componentInstance['previewAsRecipient']();
    expect(router.navigate).toHaveBeenCalledWith(['/creator/preview', 'exp_1']);
  });

  it('goToDashboard navigates to /creator', async () => {
    render();
    await fixture.componentInstance['goToDashboard']();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
  });

  it('shows an honestly-labeled share stats placeholder, not fabricated numbers', () => {
    render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Coming soon');
    expect(text).toContain('Views and completions will appear here');
  });
});
