import { Component, inject, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SurveyService } from '../survey-service';

/**
 * Component for creating new polls/surveys
 * Handles form validation, dynamic question/answer management, and poll submission
 */
@Component({
  selector: 'app-create-poll',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-poll.html',
  styleUrl: './create-poll.scss',
  host: {
    '(document:click)': 'closeCategoryDropdownOnOutsideClick($event)',
  },
})
export class CreatePoll {
  fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly surveyService = inject(SurveyService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  isCategoryDropdownOpen = false;
  showSuccessOverlay = false;
  selectedCategory = 'Team Activities';
  
  /** Available poll categories for selection */
  categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation'
  ];

  pollForm = this.fb.group({
    surveyName: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^(\s+\S+\s*)*(?!\s).*$/)]],
    describingText: [''],
    endDate: ['', [Validators.required, this.noPastDateValidator()]],
    category: [''],
    questions: this.fb.array([], Validators.required)
  });

  ngOnInit() {
    this.addQuestion();
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
    this.pollForm.patchValue({ category });
    this.isCategoryDropdownOpen = false;
  }

  closeCategoryDropdownOnOutsideClick(event: Event): void {
    const target = event.target;
    const dropdownElement = this.elementRef.nativeElement.querySelector('.category-dropdown');

    if (target instanceof Node && dropdownElement && !dropdownElement.contains(target)) {
      this.isCategoryDropdownOpen = false;
    }
  }

  get questions() {
    return this.pollForm.get('questions') as FormArray;
  }

  getAnswers(questionIndex: number) {
    return this.questions.at(questionIndex).get('answers') as FormArray;
  }

  /**
   * Creates a new question form group with default values
   * Each question starts with 2 empty answer fields
   * @returns FormGroup containing question fields and answer array
   */
  createQuestion() {
    return this.fb.group({
      questionText: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^(\s+\S+\s*)*(?!\s).*$/)]],
      allowMultiple: [false],
      answers: this.fb.array([
        this.createAnswer(),
        this.createAnswer()
      ], [Validators.minLength(2), this.minFilledAnswersValidator(2)])
    });
  }

  createAnswer() {
    return this.fb.control('', [Validators.required, Validators.pattern(/^(\s+\S+\s*)*(?!\s).*$/)]);
  }

  /**
   * Custom validator ensuring the selected date is not in the past
   * Compares the input date with today's date
   */
  noPastDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today ? null : { pastDate: true };
    };
  }

  /**
   * Custom validator ensuring minimum number of filled answer options
   * Checks for non-empty, trimmed values
   */
  minFilledAnswersValidator(minCount: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      const filledAnswers = formArray.controls.filter(ctrl => ctrl.value && ctrl.value.trim() !== '');
      return filledAnswers.length >= minCount ? null : { minFilledAnswers: { required: minCount, actual: filledAnswers.length } };
    };
  }

  addQuestion() {
    this.questions.push(this.createQuestion());
  }

  /**
   * Removes a question from the form
   * If it's the last question, clears it instead of removing to maintain at least one question
   */
  removeQuestion(index: number) {
    if (this.questions.length === 1) {
      this.clearQuestion(index);
    } else {
      this.questions.removeAt(index);
    }
  }

  /**
   * Resets a question to its default state
   * Clears all fields and ensures exactly 2 answer options remain
   */
  clearQuestion(index: number) {
    const question = this.questions.at(index);
    question.patchValue({
      questionText: '',
      allowMultiple: false
    });
    const answers = this.getAnswers(index);
    const answerCount = answers.length;
    for (let i = 0; i < answerCount; i++) {
      answers.at(i).setValue('');
    }
    while (answers.length > 2) {
      answers.removeAt(answers.length - 1);
    }
    while (answers.length < 2) {
      answers.push(this.createAnswer());
    }
  }

  /**
   * Adds a new answer option to a specific question
   * Triggers validation after adding
   */
  addAnswer(questionIndex: number) {
    const answers = this.getAnswers(questionIndex);
    answers.push(this.createAnswer());
    answers.updateValueAndValidity();
  }

  removeAnswer(questionIndex: number, answerIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (answers.length > 2) {
      answers.removeAt(answerIndex);
      answers.updateValueAndValidity();
    }
  }

  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /** Clears the value of a specific form field */
  clearField(fieldName: string): void {
    this.pollForm.get(fieldName)?.setValue('');
  }

  /**
   * Handles form submission
   * Validates form, transforms data, submits to service, and handles success/error
   */
  async onSubmit() {
    if (this.pollForm.valid) {
      const pollData = this.transformFormToPollData();
      const result = await this.surveyService.addPoll(pollData);

      if (result.success) {
        this.handleSuccessfulSubmission(result.pollId);
      } else {
        this.handleSubmissionError(result.error);
      }
    } else {
      this.pollForm.markAllAsTouched();
    }
  }

  /**
   * Transforms reactive form data into the poll data structure required by the API
   * Maps form field names to database field names
   */
  private transformFormToPollData() {
    const formValue = this.pollForm.value;
    return {
      title: formValue.surveyName || '',
      subtitle: formValue.describingText || '',
      category: formValue.category || this.selectedCategory,
      ends_at: formValue.endDate || '',
      questions: (formValue.questions || []).map((q: any) => ({
        question_text: q.questionText,
        allow_multiple: q.allowMultiple,
        answers: q.answers || []
      }))
    };
  }

  /**
   * Handles successful poll creation
   * Shows success overlay for 2 seconds then navigates to home page
   */
  private handleSuccessfulSubmission(pollId: number): void {
    this.showSuccessOverlay = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000);
  }

  /** Logs poll creation error to console */
  private handleSubmissionError(error: any): void {
    console.error('Failed to create poll:', error);
  }
}
