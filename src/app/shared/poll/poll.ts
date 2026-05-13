import { Component, inject, effect, signal } from '@angular/core';
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

  /** Local staged vote object (option.id -> vote delta) used for live preview before submit */
  localVoteDeltas = signal<Record<number, number>>({});
  
  showNoOptionsError = false;
  showAlreadyVotedError = false;
  
  private readonly VOTES_STORAGE_KEY = 'pollapp_voted_polls';

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
    this.resetFormAndLocalState();
    this.detail().questions.forEach((question) => this.createControlsForQuestion(question));
  }

  /** Resets all reactive form controls and local vote staging state */
  private resetFormAndLocalState(): void {
    this.optionControls = {};
    this.questionControls = {};
    this.localVoteDeltas.set({});
  }

  /** Creates controls for a single question depending on selection mode */
  private createControlsForQuestion(question: Question): void {
    if (question.allow_multiple) {
      this.createCheckboxControls(question);
      return;
    }

    this.questionControls[question.id] = new FormControl({
      value: null,
      disabled: this.isVotingDisabled,
    });
  }

  /** Creates checkbox controls for all options of a multi-select question */
  private createCheckboxControls(question: Question): void {
    question.options.forEach((option) => {
      this.optionControls[option.id] = new FormControl({
        value: false,
        disabled: this.isVotingDisabled,
      });
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

  /** Returns true if the poll has already been voted on in this browser */
  get isAlreadyVoted(): boolean {
    const pollId = this.detail().id;
    return pollId > 0 && this.hasAlreadyVoted(pollId);
  }

  /** Returns true if voting should be disabled */
  get isVotingDisabled(): boolean {
    return this.isExpired || this.isAlreadyVoted;
  }

  get hasQuestions(): boolean {
    return this.detail().questions && this.detail().questions.length > 0;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); 
  }
  
  /** Checks if any question has received at least one vote */
  hasAnyVotes(): boolean {
    return this.detail().questions.some((question) =>
      question.options.some((option) => this.getDisplayedOptionVotes(option.id, question) > 0)
    );
  }
  
  /** Calculates the total number of votes for a specific question */
  getDisplayedTotalVotes(question: Question): number {
    return question.options.reduce(
      (total, option) => total + this.getDisplayedOptionVotes(option.id, question),
      0,
    );
  }
  
  /**
   * Calculates the percentage of votes for a specific option
   * Returns 0 if no votes have been cast yet
   */
  getDisplayedVotePercentage(optionId: number, question: Question): number {
    const total = this.getDisplayedTotalVotes(question);
    if (total === 0) return 0;
    const optionVotes = this.getDisplayedOptionVotes(optionId, question);
    return Math.round((optionVotes / total) * 100);
  }

  private getDisplayedOptionVotes(optionId: number, question: Question): number {
    const option = question.options.find((item) => item.id === optionId);
    if (!option) return 0;

    return option.votes + this.getLocalVoteDelta(optionId);
  }

  private getLocalVoteDelta(optionId: number): number {
    return this.localVoteDeltas()[optionId] ?? 0;
  }

  /** Rebuilds local staged votes whenever checkbox/radio selection changes */
  onSelectionChanged(): void {
    if (this.isVotingDisabled) {
      return;
    }

    const nextVoteDeltas = this.buildVoteDeltasFromSelection();
    this.localVoteDeltas.set(nextVoteDeltas);
    this.clearSelectionErrorIfNeeded(nextVoteDeltas);
  }

  /** Builds vote deltas from current checkbox and radio form control values */
  private buildVoteDeltasFromSelection(): Record<number, number> {
    const nextVoteDeltas: Record<number, number> = {};
    this.collectCheckboxDeltas(nextVoteDeltas);
    this.collectRadioDeltas(nextVoteDeltas);
    return nextVoteDeltas;
  }

  /** Adds selected checkbox options to local vote deltas */
  private collectCheckboxDeltas(nextVoteDeltas: Record<number, number>): void {
    Object.keys(this.optionControls).forEach((optionId) => {
      const parsedOptionId = Number(optionId);
      if (this.optionControls[parsedOptionId]?.value === true) {
        nextVoteDeltas[parsedOptionId] = 1;
      }
    });
  }

  /** Adds selected radio options to local vote deltas */
  private collectRadioDeltas(nextVoteDeltas: Record<number, number>): void {
    Object.keys(this.questionControls).forEach((questionId) => {
      const selectedOptionId = this.questionControls[Number(questionId)]?.value;
      if (selectedOptionId !== null && selectedOptionId !== undefined) {
        nextVoteDeltas[Number(selectedOptionId)] = 1;
      }
    });
  }

  /** Hides "no options selected" error once at least one local selection exists */
  private clearSelectionErrorIfNeeded(nextVoteDeltas: Record<number, number>): void {
    if (Object.keys(nextVoteDeltas).length > 0) {
      this.showNoOptionsError = false;
    }
  }

  /**
   * Handles poll vote submission
   * Validates that at least one option is selected and that user hasn't already voted
   */
  async onSubmit() {
    const pollId = this.detail().id;
    
    if (this.isAlreadyVoted) {
      this.showAlreadyVotedError = true;
      this.showNoOptionsError = false;
      return;
    }
    
    const selectedOptionIds = this.collectSelectedOptionIds();
    
    if (selectedOptionIds.length === 0) {
      this.showNoOptionsError = true;
      this.showAlreadyVotedError = false;
      return;
    }
    
    this.showNoOptionsError = false;
    this.showAlreadyVotedError = false;
    await this.handleVoteSubmission(selectedOptionIds, pollId);
  }

  /** Collects all selected option IDs from both checkbox and radio controls */
  private collectSelectedOptionIds(): number[] {
    return Object.keys(this.localVoteDeltas())
      .filter((optionId) => (this.localVoteDeltas()[Number(optionId)] ?? 0) > 0)
      .map((optionId) => Number(optionId));
  }

  /**
   * Checks if the user has already voted on this poll
   * by checking localStorage for the poll id
   */
  private hasAlreadyVoted(pollId: number): boolean {
    try {
      const votedPollsJson = localStorage.getItem(this.VOTES_STORAGE_KEY);
      if (!votedPollsJson) return false;
      const votedPolls = JSON.parse(votedPollsJson);
      return Array.isArray(votedPolls) && votedPolls.includes(pollId);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return false;
    }
  }

  /**
   * Stores the poll id in localStorage to prevent duplicate votes
   */
  private saveVotedPoll(pollId: number): void {
    try {
      const votedPollsJson = localStorage.getItem(this.VOTES_STORAGE_KEY);
      let votedPolls = votedPollsJson ? JSON.parse(votedPollsJson) : [];
      if (!Array.isArray(votedPolls)) {
        votedPolls = [];
      }
      if (!votedPolls.includes(pollId)) {
        votedPolls.push(pollId);
        localStorage.setItem(this.VOTES_STORAGE_KEY, JSON.stringify(votedPolls));
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  /**
   * Submits votes to the server and reloads poll data to show updated results
   * Saves poll id to localStorage on success to prevent duplicate votes
   * Shows alert on error
   */
  private async handleVoteSubmission(selectedOptionIds: number[], pollId: number): Promise<void> {
    try {
      await this.pollService.submitVotes(selectedOptionIds);
      this.saveVotedPoll(pollId);
      this.localVoteDeltas.set({});
      await this.pollService.loadPollById(this.detail().id);
    } catch (error) {
      alert('Failed to submit your vote. Please try again.');
    }
  }

}


