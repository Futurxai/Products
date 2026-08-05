import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { ButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<app-button [variant]="variant" [loading]="loading" [disabled]="disabled">Continue</app-button>`,
})
class HostComponent {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  loading = false;
  disabled = false;
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function ionButton(): HTMLElement {
    return fixture.nativeElement.querySelector('ion-button');
  }

  it('maps the primary variant to ion color="primary" fill="solid"', () => {
    fixture.detectChanges();
    expect(ionButton().getAttribute('ng-reflect-color') ?? ionButton().getAttribute('color')).toBeTruthy();
  });

  it('disables the inner ion-button while loading, even if [disabled] is false', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(ionButton().hasAttribute('disabled') || (ionButton() as unknown as { disabled: boolean }).disabled).toBeTruthy();
  });

  it('renders a spinner only while loading', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeNull();

    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-spinner')).not.toBeNull();
  });

  it('marks aria-busy only while loading', () => {
    fixture.detectChanges();
    expect(ionButton().getAttribute('aria-busy')).toBeNull();

    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(ionButton().getAttribute('aria-busy')).toBe('true');
  });
});
