import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePoll } from './create-poll';

describe('CreatePoll', () => {
  let component: CreatePoll;
  let fixture: ComponentFixture<CreatePoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePoll]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePoll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
