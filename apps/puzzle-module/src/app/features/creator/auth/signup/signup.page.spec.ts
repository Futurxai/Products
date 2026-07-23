import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { AuthFacade } from '@application/creator/auth.facade';
import { ToastService } from '@shared/toast/toast.service';

import { SignupPage } from './signup.page';

describe('SignupPage', () => {
  let fixture: ComponentFixture<SignupPage>;
  let page: SignupPage;
  let signUp: jasmine.Spy;
  let router: Router;
  let toast: ToastService;

  beforeEach(() => {
    signUp = jasmine.createSpy('signUp').and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            actionLoading: signal(false),
            actionError: signal<string | null>(null),
            clearError: jasmine.createSpy('clearError'),
            signUp,
            logInWithGoogle: jasmine.createSpy('logInWithGoogle').and.resolveTo(true),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(SignupPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toast, 'success');
  });

  function fillValidForm(): void {
    page['form'].setValue({
      displayName: 'Vikram Rao',
      email: 'vikram.rao@example.com',
      password: 'DevTest123',
      confirmPassword: 'DevTest123',
    });
  }

  it('does not call signUp when the form is invalid, and marks every field touched', async () => {
    await page['submit']();

    expect(signUp).not.toHaveBeenCalled();
    expect(page['form'].controls.displayName.touched).toBeTrue();
    expect(page['form'].controls.confirmPassword.touched).toBeTrue();
  });

  it('flags a mismatched confirmation distinctly from an empty one', () => {
    page['form'].controls.password.setValue('DevTest123');
    page['form'].controls.confirmPassword.setValue('DevTest124');
    page['form'].controls.confirmPassword.markAsTouched();
    expect(page['confirmPasswordError']).toBe('Passwords do not match.');
  });

  it('surfaces a weak-password message distinct from a required message', () => {
    page['form'].controls.password.setValue('abcdefgh');
    page['form'].controls.password.markAsTouched();
    expect(page['passwordError']).toBe('Use at least 8 characters, with a letter and a number.');
  });

  it('rejects submission when passwords do not match, even if every individual field is otherwise valid', async () => {
    page['form'].setValue({
      displayName: 'Vikram Rao',
      email: 'vikram.rao@example.com',
      password: 'DevTest123',
      confirmPassword: 'DevTest124',
    });

    await page['submit']();

    expect(signUp).not.toHaveBeenCalled();
  });

  it('calls AuthFacade.signUp with the form values and navigates to /creator on success', async () => {
    fillValidForm();

    await page['submit']();

    expect(signUp).toHaveBeenCalledWith('vikram.rao@example.com', 'DevTest123', 'Vikram Rao');
    expect(toast.success).toHaveBeenCalledWith('Welcome to Love Digitally!');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
  });

  it('does not navigate when AuthFacade.signUp resolves false (e.g. email already in use)', async () => {
    signUp.and.resolveTo(false);
    fillValidForm();

    await page['submit']();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
