import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent, StepperStep } from './stepper.component';

@Component({
  standalone: true,
  imports: [StepperComponent],
  template: `<app-stepper [steps]="steps" [currentStepId]="currentStepId" [completedStepIds]="completedStepIds" (stepSelected)="onSelected($event)"></app-stepper>`,
})
class HostComponent {
  steps: StepperStep[] = [
    { id: 'occasion', label: 'Occasion' },
    { id: 'image', label: 'Image' },
    { id: 'recipient', label: 'Recipient' },
  ];
  currentStepId = 'image';
  completedStepIds = new Set(['occasion']);
  selected: string | null = null;

  onSelected(id: string): void {
    this.selected = id;
  }
}

describe('StepperComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.app-stepper__button'));
  }

  it('renders one button per step, in order', () => {
    expect(buttons().length).toBe(3);
    expect(buttons()[0].textContent).toContain('Occasion');
    expect(buttons()[1].textContent).toContain('Image');
    expect(buttons()[2].textContent).toContain('Recipient');
  });

  it('marks the current step with aria-current and aria-selected', () => {
    const current = buttons()[1];
    expect(current.getAttribute('aria-current')).toBe('step');
    expect(current.getAttribute('aria-selected')).toBe('true');
    expect(buttons()[0].getAttribute('aria-current')).toBeNull();
  });

  it('shows a checkmark for completed steps other than the current one', () => {
    expect(buttons()[0].querySelector('.app-stepper__index')?.textContent?.trim()).toContain('✓');
  });

  it('shows the ordinal number for incomplete/current steps', () => {
    expect(buttons()[1].querySelector('.app-stepper__index')?.textContent?.trim()).toBe('2');
    expect(buttons()[2].querySelector('.app-stepper__index')?.textContent?.trim()).toBe('3');
  });

  it('emits stepSelected with the clicked step id', () => {
    buttons()[2].click();
    expect(fixture.componentInstance.selected).toBe('recipient');
  });
});
