import { fakeAsync, tick } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    service = new ToastService();
  });

  it('starts with an empty queue', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('show() appends a toast with an incrementing id', () => {
    service.show('First');
    service.show('Second');

    expect(service.toasts().map((t) => t.text)).toEqual(['First', 'Second']);
    expect(service.toasts()[0].id).not.toBe(service.toasts()[1].id);
  });

  it('success()/error() set the corresponding variant', () => {
    service.success('Saved');
    service.error('Failed');

    expect(service.toasts()[0].variant).toBe('success');
    expect(service.toasts()[1].variant).toBe('error');
  });

  it('defaults to the info variant', () => {
    service.show('Just FYI');
    expect(service.toasts()[0].variant).toBe('info');
  });

  it('dismiss() removes only the matching toast', () => {
    service.show('Keep me');
    service.show('Remove me');
    const [, second] = service.toasts();

    service.dismiss(second.id);

    expect(service.toasts().map((t) => t.text)).toEqual(['Keep me']);
  });

  it('auto-dismisses after the given duration', fakeAsync(() => {
    service.show('Temporary', 'info', 1000);
    expect(service.toasts().length).toBe(1);

    tick(999);
    expect(service.toasts().length).toBe(1);

    tick(1);
    expect(service.toasts().length).toBe(0);
  }));

  it('defaults the auto-dismiss duration to 4000ms', fakeAsync(() => {
    service.show('Default duration');
    tick(3999);
    expect(service.toasts().length).toBe(1);
    tick(1);
    expect(service.toasts().length).toBe(0);
  }));
});
