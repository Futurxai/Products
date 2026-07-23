import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen" [dismissible]="dismissible" [label]="label" (closed)="closedCount = closedCount + 1">
      <p>modal body</p>
    </app-modal>
  `,
})
class HostComponent {
  isOpen = false;
  dismissible = true;
  label = '';
  closedCount = 0;
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function ionModal(): HTMLElement {
    return fixture.nativeElement.querySelector('ion-modal');
  }

  it('wires isOpen through to ion-modal', () => {
    fixture.detectChanges();
    expect((ionModal() as unknown as { isOpen: boolean }).isOpen).toBeFalse();

    fixture.componentInstance.isOpen = true;
    fixture.detectChanges();
    expect((ionModal() as unknown as { isOpen: boolean }).isOpen).toBeTrue();
  });

  it('wires dismissible through to ion-modal\'s backdropDismiss', () => {
    fixture.componentInstance.dismissible = false;
    fixture.detectChanges();
    expect((ionModal() as unknown as { backdropDismiss: boolean }).backdropDismiss).toBeFalse();
  });

  it('emits closed when ion-modal dismisses', () => {
    fixture.detectChanges();
    ionModal().dispatchEvent(new CustomEvent('didDismiss'));
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

});

// `role="dialog"`/`aria-label` on the projected `.app-modal` div are
// exercised through real usage (the Preview's Question modal) rather
// than here — `ion-modal` only instantiates its `<ng-template>` content
// into the DOM once actually presented (an animated, async overlay
// lifecycle), which a synchronous unit test can't observe reliably.
