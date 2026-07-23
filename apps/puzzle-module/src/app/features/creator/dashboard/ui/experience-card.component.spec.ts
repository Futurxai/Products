import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';

import { ExperienceCardComponent } from './experience-card.component';

@Component({
  standalone: true,
  imports: [ExperienceCardComponent],
  template: `<app-experience-card [experience]="experience"></app-experience-card>`,
})
class HostComponent {
  experience!: PuzzleExperience;
}

function baseExperience(overrides: Partial<PuzzleExperience>): PuzzleExperience {
  return {
    ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('ExperienceCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function render(experience: PuzzleExperience): void {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.experience = experience;
    fixture.detectChanges();
  }

  it('renders the occasion and recipient name', () => {
    render(baseExperience({}));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Anniversary');
    expect(text).toContain('For Ananya');
  });

  it('shows a "Draft" badge for a draft, and "Created" as the date label', () => {
    render(baseExperience({ status: 'draft' }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Draft');
    expect(text).toContain('Created 1 Jan 2026');
  });

  it('shows a "Published" badge and date once published', () => {
    render(baseExperience({ status: 'published', publishedAt: new Date('2026-02-15T00:00:00Z') }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Published');
    expect(text).toContain('Published 15 Feb 2026');
  });

  it('prefers the completedAt date over publishedAt once completed', () => {
    render(
      baseExperience({
        status: 'completed',
        publishedAt: new Date('2026-02-15T00:00:00Z'),
        completedAt: new Date('2026-03-01T00:00:00Z'),
      }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Completed 1 Mar 2026');
    expect(text).not.toContain('Published 15 Feb 2026');
  });

  it('shows "In Progress" for an in_progress experience', () => {
    render(baseExperience({ status: 'in_progress', publishedAt: new Date('2026-02-15T00:00:00Z') }));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('In Progress');
  });
});
