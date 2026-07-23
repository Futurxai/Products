import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthShellComponent } from './auth-shell.component';

@Component({
  standalone: true,
  imports: [AuthShellComponent],
  template: `<app-auth-shell [title]="title" [subtitle]="subtitle"><p class="projected">content</p></app-auth-shell>`,
})
class HostComponent {
  title = 'Welcome back';
  subtitle = '';
}

describe('AuthShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renders the title and projects content', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-shell__title').textContent).toContain('Welcome back');
    expect(fixture.nativeElement.querySelector('.projected')).not.toBeNull();
  });

  it('omits the subtitle element when not provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-shell__subtitle')).toBeNull();
  });

  it('renders the subtitle when provided', () => {
    fixture.componentInstance.subtitle = 'Sign in to continue';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-shell__subtitle').textContent).toContain('Sign in to continue');
  });
});
