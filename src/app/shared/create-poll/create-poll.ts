import { Component, inject, ElementRef } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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

  isCategoryDropdownOpen = false;
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
    surveyName: [''],
    describingText: [''],
    endDate: [''],
    category: [''],
    questions: this.fb.array([])
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
      questionText: [''],
      allowMultiple: [false],
      answers: this.fb.array([
        this.createAnswer(),
        this.createAnswer()
      ])
    });
  }

  createAnswer() {
    return this.fb.control('');
  }

  addQuestion() {
    this.questions.push(this.createQuestion());
  }

  removeQuestion(index: number) {
    if (index === 0) {
      // Erste Question: nur Inhalt löschen
      this.clearQuestion(index);
    } else {
      // Weitere Questions: komplett entfernen
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
    answers.clear();
    answers.push(this.createAnswer());
    answers.push(this.createAnswer());
  }

  addAnswer(questionIndex: number) {
    this.getAnswers(questionIndex).push(this.createAnswer());
  }

  removeAnswer(questionIndex: number, answerIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (answers.length > 2) {
      answers.removeAt(answerIndex);
    }
  }

  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  clearField(fieldName: string): void {
    this.pollForm.get(fieldName)?.setValue('');
  }

  onSubmit() {
    console.log(this.pollForm.value);
  }
}
