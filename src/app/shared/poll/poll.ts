import { Component, inject, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SurveyService } from '../survey-service';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../interfaces/interface';

/**
 * Component for viewing and voting on polls
 * Displays poll details, questions, and live voting results
 */
@Component({
  selector: 'app-poll',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './poll.html',
  styleUrl: './poll.scss',
})
export class Poll {

  private route = inject(ActivatedRoute);
  router = inject(Router);
  pollService = inject(SurveyService);

  detail = this.pollService.pollDetail;
  
  /** Form controls for checkbox-based multiple choice questions (option.id -> FormControl) */
  optionControls: Record<number, FormControl> = {};
  
  /** Form controls for radio-based single choice questions (question.id -> FormControl) */
  questionControls: Record<number, FormControl> = {};
  
  showNoOptionsError = false;

  constructor() {
    effect(() => {
      const poll = this.detail();
      if (poll.id > 0 && poll.questions.length > 0) {
        this.initializeFormControls();
      }
    });
  }

  ngOnInit(){
    let currentId = Number(this.route.snapshot.paramMap.get('id'));
    if(currentId) {
      this.pollService.setPollDetailById(currentId);
      if(this.detail().id === 0) {
        this.pollService.loadPollById(currentId);
      }
    }
  }

  /**
   * Initializes form controls for all poll questions
   * Creates checkbox controls for multiple-choice questions
   * Creates radio button controls for single-choice questions
   */
  initializeFormControls() {
    this.optionControls = {};
    this.questionControls = {};
    
    this.detail().questions.forEach(question => {
      if (question.allow_multiple) {
        question.options.forEach(option => {
          this.optionControls[option.id] = new FormControl(false);
        });
      } else {
        this.questionControls[question.id] = new FormControl(null);
      }
    });
  }

  /** Returns the parsed end date of the poll or null if invalid */
  get endDate(): Date | null {
    const poll = this.detail();
    if (!poll || !poll.ends_at || poll.ends_at === 'n/a') return null;
    const date = new Date(poll.ends_at);
    return isNaN(date.getTime()) ? null : date;
  }

  /** Returns the current status of the poll ('Published' or 'Expired') */
  get status(): string {
    const poll = this.detail();
    if (!poll || !poll.ends_at || poll.ends_at === 'n/a') return 'Published';
    
    const endDate = new Date(poll.ends_at);
    if (isNaN(endDate.getTime())) return 'Published';
    
    const currentDate = new Date();    
    return currentDate > endDate ? 'Expired' : 'Published';
  }

  /** Returns true if the poll has expired and no longer accepts votes */
  get isExpired(): boolean {
    return this.status === 'Expired';
  }

  get hasQuestions(): boolean {
    return this.detail().questions && this.detail().questions.length > 0;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); 
  }
  
  /** Checks if any question has received at least one vote */
  hasAnyVotes(): boolean {
    return this.detail().questions.some(q => 
      q.options.some(opt => opt.votes > 0)
    );
  }
  
  /** Calculates the total number of votes for a specific question */
  getTotalVotes(question: Question): number {
    let total = 0;
    for (let option of question.options) {
      total += option.votes;
    }
    return total;
  }
  
  /**
   * Calculates the percentage of votes for a specific option
   * Returns 0 if no votes have been cast yet
   */
  getVotePercentage(optionVotes: number, question: Question): number {
    const total = this.getTotalVotes(question);
    if (total === 0) return 0;
    return Math.round((optionVotes / total) * 100);
  }

  /**
   * Handles poll vote submission
   * Validates that at least one option is selected before submitting
   */
  async onSubmit() {
    const selectedOptionIds = this.collectSelectedOptionIds();
    
    if (selectedOptionIds.length === 0) {
      this.showNoOptionsError = true;
      return;
    }
    
    this.showNoOptionsError = false;
    await this.handleVoteSubmission(selectedOptionIds);
  }

  /** Collects all selected option IDs from both checkbox and radio controls */
  private collectSelectedOptionIds(): number[] {
    const selectedIds: number[] = [];
    this.collectCheckboxSelections(selectedIds);
    this.collectRadioSelections(selectedIds);
    return selectedIds;
  }

  /** Collects selected option IDs from checkbox controls (multiple-choice questions) */
  private collectCheckboxSelections(selectedIds: number[]): void {
    Object.keys(this.optionControls).forEach(optionId => {
      const control = this.optionControls[Number(optionId)];
      if (control.value === true) {
        selectedIds.push(Number(optionId));
      }
    });
  }

  /** Collects selected option IDs from radio controls (single-choice questions) */
  private collectRadioSelections(selectedIds: number[]): void {
    Object.keys(this.questionControls).forEach(questionId => {
      const control = this.questionControls[Number(questionId)];
      if (control.value !== null) {
        selectedIds.push(Number(control.value));
      }
    });
  }

  /**
   * Submits votes to the server and reloads poll data to show updated results
   * Shows alert on error
   */
  private async handleVoteSubmission(selectedOptionIds: number[]): Promise<void> {
    try {
      await this.pollService.submitVotes(selectedOptionIds);
      await this.pollService.loadPollById(this.detail().id);
    } catch (error) {
      alert('Failed to submit your vote. Please try again.');
    }
  }

}


