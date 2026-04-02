import { Component, inject } from '@angular/core';
import { SurveyService } from '../shared/survey-service';
import { RouterLink } from '@angular/router';
import { Poll } from '../shared/interfaces/interface';

@Component({
  selector: 'app-surveys',
  imports: [RouterLink],
  templateUrl: './surveys.html',
  styleUrl: './surveys.scss',
})
export class Surveys {
  survey = inject(SurveyService);

  pollList = this.survey.pollList;

  isActive = true;

  setFilter(showActive: boolean): void {
    this.isActive = showActive;
  }

  getEndingSoonPolls(): Poll[] {
    return [...this.pollList()]
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
      .slice(0, 3);
  }

  getActivePolls(): Poll[] {
    const now = new Date().getTime();

    return [...this.pollList()]
      .filter((item) => new Date(item.ends_at).getTime() >= now)
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
  }

  getPastPolls(): Poll[] {
    const now = new Date().getTime();

    return [...this.pollList()]
      .filter((item) => new Date(item.ends_at).getTime() < now)
      .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime());
  }

  getDaysLeft(endDate: string): number {
    const today = new Date();
    const endsAt = new Date(endDate);
    const diffInMs = endsAt.getTime() - today.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return Math.max(diffInDays, 0);
  }
}
