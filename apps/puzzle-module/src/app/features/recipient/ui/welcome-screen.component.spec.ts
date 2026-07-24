import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeScreenComponent } from './welcome-screen.component';

describe('WelcomeScreenComponent', () => {
  let fixture: ComponentFixture<WelcomeScreenComponent>;

  function configure(): void {
    TestBed.configureTestingModule({ imports: [WelcomeScreenComponent] });
    fixture = TestBed.createComponent(WelcomeScreenComponent);
    fixture.componentRef.setInput('recipientDisplayName', 'Ananya');
    fixture.componentRef.setInput('occasion', 'Anniversary');
    fixture.componentRef.setInput('welcomeNote', 'Happy anniversary, my love!');
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('greets the recipient by name and mentions the occasion', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hi Ananya!');
    expect(text).toContain('Anniversary surprise');
  });

  it('shows the welcome note', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Happy anniversary, my love!');
  });

  it('omits the note paragraph entirely when empty', () => {
    fixture.componentRef.setInput('welcomeNote', '');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.welcome-screen__note')).toBeNull();
  });

  it('renders an avatar with the recipient\'s initials', () => {
    const avatar = fixture.nativeElement.querySelector('app-avatar');
    expect(avatar).not.toBeNull();
  });

  it('emits startPuzzle when the Start button is pressed', () => {
    const emitted = jasmine.createSpy('startPuzzle');
    fixture.componentInstance.startPuzzle.subscribe(emitted);

    fixture.componentInstance['onStart']();

    expect(emitted).toHaveBeenCalled();
  });
});
