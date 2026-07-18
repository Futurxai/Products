import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaffoldPlaceholderPage } from './scaffold-placeholder.page';

describe('ScaffoldPlaceholderPage', () => {
  let fixture: ComponentFixture<ScaffoldPlaceholderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScaffoldPlaceholderPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ScaffoldPlaceholderPage);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the milestone heading, proving the scaffold boots end-to-end', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Scaffold is live.');
  });
});
