import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressBarComponent } from './progress-bar.component';

@Component({
  standalone: true,
  imports: [ProgressBarComponent],
  template: `<app-progress-bar [value]="value" [max]="max" [label]="label"></app-progress-bar>`,
})
class HostComponent {
  value = 3;
  max = 9;
  label = '';
}

describe('ProgressBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function progressBar(): HTMLElement {
    return fixture.nativeElement.querySelector('ion-progress-bar');
  }

  it('converts value/max into a 0-1 fraction', () => {
    fixture.detectChanges();
    expect((progressBar() as unknown as { value: number }).value).toBeCloseTo(3 / 9);
  });

  it('clamps to 1 when value exceeds max', () => {
    fixture.componentInstance.value = 12;
    fixture.detectChanges();
    expect((progressBar() as unknown as { value: number }).value).toBe(1);
  });

  it('treats a zero max as an empty bar instead of dividing by zero', () => {
    fixture.componentInstance.max = 0;
    fixture.detectChanges();
    expect((progressBar() as unknown as { value: number }).value).toBe(0);
  });

  it('omits the label paragraph when no label is given', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-progress-bar__label')).toBeNull();
  });

  it('renders the label when given', () => {
    fixture.componentInstance.label = '3 of 9 questions ready';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-progress-bar__label').textContent).toContain('3 of 9 questions ready');
  });
});
