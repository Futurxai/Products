import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { AuthFacade } from '@application/creator/auth.facade';
import { ToastService } from '@shared/toast/toast.service';

import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let page: LoginPage;
  let logIn: jasmine.Spy;
  let logInWithGoogle: jasmine.Spy;
  let router: Router;
  let toast: ToastService;

  function configure(returnUrl: string | null): void {
    logIn = jasmine.createSpy('logIn').and.resolveTo(true);
    logInWithGoogle = jasmine.createSpy('logInWithGoogle').and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            actionLoading: signal(false),
            actionError: signal<string | null>(null),
            clearError: jasmine.createSpy('clearError'),
            logIn,
            logInWithGoogle,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
      ],
    });

    fixture = TestBed.createComponent(LoginPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toast, 'success');
  }

  beforeEach(() => configure(null));

  it('does not call logIn and marks the form touched when submitted while invalid', async () => {
    await page['submit']();

    expect(logIn).not.toHaveBeenCalled();
    expect(page['form'].controls.email.touched).toBeTrue();
    expect(page['form'].controls.password.touched).toBeTrue();
  });

  it('surfaces a required error only after the email field has been touched', () => {
    expect(page['emailError']).toBeNull();
    page['form'].controls.email.markAsTouched();
    expect(page['emailError']).toBe('Email is required.');
  });

  it('surfaces an emailFormat error distinctly from a required error', () => {
    page['form'].controls.email.setValue('not-an-email');
    page['form'].controls.email.markAsTouched();
    expect(page['emailError']).toBe('Enter a valid email address.');
  });

  it('calls AuthFacade.logIn with the form values and navigates to /creator on success by default', async () => {
    page['form'].setValue({ email: 'vikram.rao@example.com', password: 'DevTest@123' });

    await page['submit']();

    expect(logIn).toHaveBeenCalledWith('vikram.rao@example.com', 'DevTest@123');
    expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
  });

  it('does not navigate when AuthFacade.logIn resolves false', async () => {
    logIn.and.resolveTo(false);
    page['form'].setValue({ email: 'vikram.rao@example.com', password: 'wrong' });

    await page['submit']();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('continueWithGoogle calls AuthFacade.logInWithGoogle and navigates on success', async () => {
    await page['continueWithGoogle']();

    expect(logInWithGoogle).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
  });

  it('navigates to the returnUrl query param when present, instead of the /creator default', async () => {
    TestBed.resetTestingModule();
    configure('/creator/dashboard');
    page['form'].setValue({ email: 'vikram.rao@example.com', password: 'DevTest@123' });

    await page['submit']();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator/dashboard');
  });
});
