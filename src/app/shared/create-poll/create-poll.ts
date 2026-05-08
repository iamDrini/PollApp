import { Component, inject, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SurveyService } from '../survey-service';

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
  selectedCategory = 'Choose category';
  categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation'
  ];

  pollForm = this.fb.group({
    surveyName: ['', Validators.required],
    describingText: [''],
    endDate: ['', Validators.required],
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

  createQuestion() {
    return this.fb.group({
      questionText: ['', Validators.required],
      allowMultiple: [false],
      answers: this.fb.array([
        this.createAnswer(),
        this.createAnswer()
      ], [Validators.minLength(2), this.minFilledAnswersValidator(2)])
    });
  }

  createAnswer() {
    return this.fb.control('', Validators.required);
  }

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

  removeQuestion(index: number) {
    if (this.questions.length === 1) {
      this.clearQuestion(index);
    } else {
      this.questions.removeAt(index);
    }
  }

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

  clearField(fieldName: string): void {
    this.pollForm.get(fieldName)?.setValue('');
  }

  async onSubmit() {
    if (this.pollForm.valid) {
      const formValue = this.pollForm.value;
      const pollData = {
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
      const result = await this.surveyService.addPoll(pollData);
      
      if (result.success) {
        console.log('Poll successfully created with ID:', result.pollId);
        this.showSuccessOverlay = true;
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      } else {
        console.error('Failed to create poll:', result.error);
      }
    } else {
      this.pollForm.markAllAsTouched();
    }
  }
}
