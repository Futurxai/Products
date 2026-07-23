import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { InputComponent } from './input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  template: `<app-input [formControl]="control" label="Email" errorMessage="Enter a valid email" hint="We'll never share this"></app-input>`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true });
}

describe('InputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function ionInput(): HTMLElement {
    return fixture.nativeElement.querySelector('ion-input');
  }

  it('writes the form control value into ion-input via writeValue', () => {
    fixture.componentInstance.control.setValue('vikram.rao@example.com');
    fixture.detectChanges();
    expect((ionInput() as unknown as { value: string }).value).toBe('vikram.rao@example.com');
  });

  it('propagates ionInput events back into the form control', () => {
    ionInput().dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'new@example.com' } }));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe('new@example.com');
  });

  it('marks the control touched on ionBlur', () => {
    expect(fixture.componentInstance.control.touched).toBeFalse();
    ionInput().dispatchEvent(new CustomEvent('ionBlur'));
    expect(fixture.componentInstance.control.touched).toBeTrue();
  });

  it('disables the inner ion-input when the form control is disabled', () => {
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect((ionInput() as unknown as { disabled: boolean }).disabled).toBeTrue();
  });

  it('shows the error message (not the hint) when errorMessage is set', () => {
    const message: HTMLElement = fixture.nativeElement.querySelector('.app-input__message');
    expect(message.textContent).toContain('Enter a valid email');
    expect(message.classList.contains('app-input__message--error')).toBeTrue();
  });
});
