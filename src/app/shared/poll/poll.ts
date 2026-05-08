import { Component, inject, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SurveyService } from '../survey-service';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../interfaces/interface';

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
  optionControls: Record<number, FormControl> = {};
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

  initializeFormControls() {
    // Leere vorherige Controls
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

  get endDate(): Date | null {
    const poll = this.detail();
    if (!poll || !poll.ends_at || poll.ends_at === 'n/a') return null;
    const date = new Date(poll.ends_at);
    return isNaN(date.getTime()) ? null : date;
  }

  get status(): string {
    const poll = this.detail();
    if (!poll || !poll.ends_at || poll.ends_at === 'n/a') return 'Published';
    
    const endDate = new Date(poll.ends_at);
    if (isNaN(endDate.getTime())) return 'Published';
    
    const currentDate = new Date();    
    return currentDate > endDate ? 'Expired' : 'Published';
  }

  get isExpired(): boolean {
    return this.status === 'Expired';
  }

  get hasQuestions(): boolean {
    return this.detail().questions && this.detail().questions.length > 0;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); 
  }
  hasAnyVotes(): boolean {
    return this.detail().questions.some(q => 
      q.options.some(opt => opt.votes > 0)
    );
  }
  getTotalVotes(question: Question): number {
    let total = 0;
    for (let option of question.options) {
      total += option.votes;
    }
    return total;
  }
  getVotePercentage(optionVotes: number, question: Question): number {
    const total = this.getTotalVotes(question);
    if (total === 0) return 0;
    return Math.round((optionVotes / total) * 100);
  }

  async onSubmit() {
    const selectedOptionIds: number[] = [];
    Object.keys(this.optionControls).forEach(optionId => {
      const control = this.optionControls[Number(optionId)];
      if (control.value === true) {
        selectedOptionIds.push(Number(optionId));
      }
    });
    Object.keys(this.questionControls).forEach(questionId => {
      const control = this.questionControls[Number(questionId)];
      if (control.value !== null) {
        selectedOptionIds.push(Number(control.value));
      }
    });
    if (selectedOptionIds.length === 0) {
      this.showNoOptionsError = true;
      return;
    }
    this.showNoOptionsError = false;
    try {
      await this.pollService.submitVotes(selectedOptionIds);
      await this.pollService.loadPollById(this.detail().id);
    } catch (error) {
      console.error('Error submitting votes:', error);
      alert('Failed to submit your vote. Please try again.');
    }
  }

}


