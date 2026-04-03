import { Component, ElementRef, inject } from '@angular/core';
import { SurveyService } from '../shared/survey-service';
import { RouterLink } from '@angular/router';
import { Poll } from '../shared/interfaces/interface';

@Component({
  selector: 'app-surveys',
  imports: [RouterLink],
  templateUrl: './surveys.html',
  styleUrl: './surveys.scss',
  host: {
    '(document:click)': 'closeCategoryDropdownOnOutsideClick($event)',
  },
})
export class Surveys {
  survey = inject(SurveyService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  pollList = this.survey.pollList;

  isActive = true;
  isCategoryDropdownOpen = false;
  selectedCategory = 'All categories';

  setFilter(showActive: boolean): void {
    this.isActive = showActive;
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  closeCategoryDropdownOnOutsideClick(event: Event): void {
    const target = event.target;
    const dropdownElement = this.elementRef.nativeElement.querySelector('.category-dropdown');

    if (target instanceof Node && dropdownElement && !dropdownElement.contains(target)) {
      this.isCategoryDropdownOpen = false;
    }
  }

  getCategories(): string[] {
    return ['All categories', ...new Set(this.pollList().map((item) => item.category))];
  }

  getEndingSoonPolls(): Poll[] {
    return [...this.pollList()]
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
      .slice(0, 3);
  }

  getActivePolls(): Poll[] {
    const now = new Date().getTime();

    return this.filterByCategory(
      [...this.pollList()]
        .filter((item) => new Date(item.ends_at).getTime() >= now)
        .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()),
    );
  }

  getPastPolls(): Poll[] {
    const now = new Date().getTime();

    return this.filterByCategory(
      [...this.pollList()]
        .filter((item) => new Date(item.ends_at).getTime() < now)
        .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime()),
    );
  }

  filterByCategory(polls: Poll[]): Poll[] {
    if (this.selectedCategory === 'All categories') {
      return polls;
    }

    return polls.filter((item) => item.category === this.selectedCategory);
  }

  getDaysLeft(endDate: string): number {
    const today = new Date();
    const endsAt = new Date(endDate);
    const diffInMs = endsAt.getTime() - today.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return Math.max(diffInDays, 0);
  }
}
