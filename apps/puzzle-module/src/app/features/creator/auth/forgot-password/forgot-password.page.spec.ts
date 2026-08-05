import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthFacade } from '@application/creator/auth.facade';

import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let page: ForgotPasswordPage;
  let sendPasswordReset: jasmine.Spy;

  beforeEach(() => {
    sendPasswordReset = jasmine.createSpy('sendPasswordReset').and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            actionLoading: signal(false),
            actionError: signal<string | null>(null),
            clearError: jasmine.createSpy('clearError'),
            sendPasswordReset,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ForgotPasswordPage);
    page = fixture.componentInstance;
  });

  it('does not call sendPasswordReset when the form is invalid', async () => {
    await page['submit']();
    expect(sendPasswordReset).not.toHaveBeenCalled();
    expect(page['form'].controls.email.touched).toBeTrue();
  });

  it('starts with submitted false, showing the form', () => {
    expect(page['submitted']()).toBeFalse();
  });

  it('calls sendPasswordReset and flips to the submitted state on success', async () => {
    page['form'].setValue({ email: 'vikram.rao@example.com' });

    await page['submit']();

    expect(sendPasswordReset).toHaveBeenCalledWith('vikram.rao@example.com');
    expect(page['submitted']()).toBeTrue();
  });

  it('stays on the form (does not flip to submitted) when sendPasswordReset resolves false', async () => {
    sendPasswordReset.and.resolveTo(false);
    page['form'].setValue({ email: 'vikram.rao@example.com' });

    await page['submit']();

    expect(page['submitted']()).toBeFalse();
  });
});
