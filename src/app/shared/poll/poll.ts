import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SurveyService } from '../survey-service';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

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
  optionControls: Record<number, FormControl> = {};

  ngOnInit(){
    let currentId = Number(this.route.snapshot.paramMap.get('id'));
    if(currentId) {
      this.pollService.setPollDetailById(currentId);
      if(this.detail().id === 0) {
        this.pollService.loadPollById(currentId);
      }
    }
    this.initializeFormControls();
  }

  initializeFormControls() {
    this.detail().questions.forEach(question => {
      question.options.forEach(option => {
        this.optionControls[option.id] = new FormControl(false);
      });
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

}


