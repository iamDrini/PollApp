import { Component, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SurveyService } from '../survey-service';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../interfaces/interface';

@Component({
  selector: 'app-poll',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './poll.html',
  styleUrl: './poll.scss',
})
export class Poll {

  private route = inject(ActivatedRoute);
  router = inject(Router);
  pollService = inject(SurveyService);

  detail = this.pollService.pollDetail;
  optionControls: Record<number, FormControl> = {};  // Für Checkboxen (multiple choice)
  questionControls: Record<number, FormControl> = {}; // Für Radio Buttons (single choice)

  constructor() {
    // Effect reagiert auf Änderungen am detail Signal
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
        // Multiple Choice: Ein FormControl pro Option (Checkbox)
        question.options.forEach(option => {
          this.optionControls[option.id] = new FormControl(false);
        });
      } else {
        // Single Choice: Ein FormControl pro Question (Radio)
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

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); 
  }

  // Prüft ob es irgendwelche Votes gibt
  hasAnyVotes(): boolean {
    return this.detail().questions.some(q => 
      q.options.some(opt => opt.votes > 0)
    );
  }

  // Berechne Gesamtzahl der Votes für eine Frage
  getTotalVotes(question: Question): number {
    let total = 0;
    for (let option of question.options) {
      total += option.votes;
    }
    return total;
  }

  // Berechne Prozentsatz für eine Option
  getVotePercentage(optionVotes: number, question: Question): number {
    const total = this.getTotalVotes(question);
    if (total === 0) return 0;
    return Math.round((optionVotes / total) * 100);
  }

  async onSubmit() {
    const selectedOptionIds: number[] = [];
    
    // Sammle ausgewählte Optionen aus Checkboxen (multiple choice)
    Object.keys(this.optionControls).forEach(optionId => {
      const control = this.optionControls[Number(optionId)];
      if (control.value === true) {
        selectedOptionIds.push(Number(optionId));
      }
    });
    
    // Sammle ausgewählte Optionen aus Radio Buttons (single choice)
    Object.keys(this.questionControls).forEach(questionId => {
      const control = this.questionControls[Number(questionId)];
      if (control.value !== null) {
        selectedOptionIds.push(Number(control.value));
      }
    });
    
    // Validierung: Mindestens eine Option muss ausgewählt sein
    if (selectedOptionIds.length === 0) {
      alert('Please select at least one option');
      return;
    }
    
    // Stimmen submitten
    try {
      await this.pollService.submitVotes(selectedOptionIds);
      alert('Your vote has been submitted successfully!');
      // Reload poll data to show updated votes
      await this.pollService.loadPollById(this.detail().id);
    } catch (error) {
      console.error('Error submitting votes:', error);
      alert('Failed to submit your vote. Please try again.');
    }
  }

}


