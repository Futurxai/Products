import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TextareaComponent } from './textarea.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TextareaComponent],
  template: `<app-textarea [formControl]="control" label="Welcome message" errorMessage="Required" hint="Shown before the first question"></app-textarea>`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true });
}

describe('TextareaComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function ionTextarea(): HTMLElement {
    return fixture.nativeElement.querySelector('ion-textarea');
  }

  it('writes the form control value into ion-textarea via writeValue', () => {
    fixture.componentInstance.control.setValue('Hi Ananya, nine memories await...');
    fixture.detectChanges();
    expect((ionTextarea() as unknown as { value: string }).value).toBe('Hi Ananya, nine memories await...');
  });

  it('propagates ionInput events back into the form control', () => {
    ionTextarea().dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'New message' } }));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe('New message');
  });

  it('marks the control touched on ionBlur', () => {
    expect(fixture.componentInstance.control.touched).toBeFalse();
    ionTextarea().dispatchEvent(new CustomEvent('ionBlur'));
    expect(fixture.componentInstance.control.touched).toBeTrue();
  });

  it('disables the inner ion-textarea when the form control is disabled', () => {
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect((ionTextarea() as unknown as { disabled: boolean }).disabled).toBeTrue();
  });

  it('shows the error message (not the hint) when errorMessage is set', () => {
    const message: HTMLElement = fixture.nativeElement.querySelector('.app-textarea__message');
    expect(message.textContent).toContain('Required');
    expect(message.classList.contains('app-textarea__message--error')).toBeTrue();
  });
});
