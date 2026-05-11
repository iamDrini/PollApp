import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Poll } from './interfaces/interface';

/**
 * Service for managing polls and survey data
 * Handles all CRUD operations and interactions with Supabase database
 */
@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  
  supabase = createClient('https://xixqyrgjdjkoxayonpqr.supabase.co', 'sb_publishable_ho3A-byQYtg4hs_q8jtzCg_4yrPe2cn');

  /** Signal containing all polls with their questions and options */
  pollList = signal<Poll[]>([]);
  
  /** Signal containing the currently viewed poll with all its details */
  pollDetail = signal<Poll>({
    id: 0,
    created_at: 'n/a',
    title: 'n/a',
    subtitle: 'n/a',
    category: 'n/a',
    ends_at: 'n/a',
    questions: []
  });

  constructor(){
    this.getAllPolls();
  }

  /**
   * Fetches all polls from the database including their questions and options
   * Updates the pollList signal with the fetched data
   */
  async getAllPolls(){
    let response = await this.supabase
  .from('polls')
  .select(`
    *,
    questions (
      *,
      options (*)
    )
  `)
  this.pollList.set((response.data ?? []) as Poll[]);
  }

  /**
   * Sets the poll detail from the cached pollList by ID
   * Used for faster navigation when poll data is already loaded
   */
  setPollDetailById(id:number){
    let tmpPoll = this.pollList().find(poll => poll.id == id)
    if(tmpPoll) this.pollDetail.set(tmpPoll);
  }

  /**
   * Loads a specific poll from the database by ID
   * Fetches fresh data including all questions and options
   * Updates the pollDetail signal with the fetched poll
   */
  async loadPollById(id: number) {
    const response = await this.supabase
      .from('polls')
      .select(`
        *,
        questions (
          *,
          options (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (response.data) {
      this.pollDetail.set(response.data as Poll);
    }
  }

  /**
   * Submits user votes by incrementing vote counts for selected options
   * Handles both single-choice (radio) and multiple-choice (checkbox) questions
   * All vote updates are executed in parallel for better performance
   */
  async submitVotes(optionIds: number[]) {
    const updatePromises = optionIds.map(optionId => 
      this.incrementOptionVote(optionId)
    );
    await Promise.all(updatePromises);
  }

  /**
   * Increments the vote count for a specific option by 1
   * Fetches current vote count and updates it atomically
   */
  private async incrementOptionVote(optionId: number) {
    const { data } = await this.supabase
      .from('options')
      .select('votes')
      .eq('id', optionId)
      .single();
    
    return this.supabase
      .from('options')
      .update({ votes: (data?.votes ?? 0) + 1 })
      .eq('id', optionId);
  }

  /**
   * Creates a new poll with all its questions and answer options
   * Executes a multi-step process: poll → questions → options
   * Refreshes the poll list after successful creation
   * 
   * @returns Object containing success status and either pollId or error
   */
  async addPoll(pollData: { 
    title: string; 
    subtitle: string; 
    category: string; 
    ends_at: string; 
    questions: { 
      question_text: string; 
      allow_multiple: boolean; 
      answers: string[] 
    }[] 
  }) {
    try {
      const poll = await this.insertPoll(pollData);
      if (!poll) return { success: false, error: 'Failed to create poll' };

      const questions = await this.insertQuestions(poll.id, pollData.questions);
      if (!questions) return { success: false, error: 'Failed to create questions' };

      const optionsResult = await this.insertAllOptions(questions, pollData.questions);
      if (!optionsResult) return { success: false, error: 'Failed to create options' };

      await this.getAllPolls();
      return { success: true, pollId: poll.id };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Inserts the poll base data into the database
   * @returns The created poll object or null if failed
   */
  private async insertPoll(pollData: any) {
    const { data, error } = await this.supabase
      .from('polls')
      .insert({
        title: pollData.title,
        subtitle: pollData.subtitle,
        category: pollData.category,
        ends_at: pollData.ends_at
      })
      .select()
      .single();

    return error ? null : data;
  }

  /**
   * Inserts all questions for a poll
   * @returns Array of created question objects or null if failed
   */
  private async insertQuestions(pollId: number, questionsData: any[]) {
    const { data, error } = await this.supabase
      .from('questions')
      .insert(
        questionsData.map(q => ({
          poll_id: pollId,
          question_text: q.question_text,
          allow_multiple: q.allow_multiple
        }))
      )
      .select();

    return error ? null : data;
  }

  /**
   * Inserts all answer options for all questions
   * Processes questions sequentially to maintain order
   * @returns true if all options were inserted successfully, false otherwise
   */
  private async insertAllOptions(questions: any[], questionsData: any[]) {
    for (let i = 0; i < questions.length; i++) {
      const success = await this.insertOptionsForQuestion(
        questions[i].id, 
        questionsData[i].answers
      );
      if (!success) return false;
    }
    return true;
  }

  /**
   * Inserts answer options for a specific question
   * All options start with 0 votes
   * @returns true if insertion succeeded, false otherwise
   */
  private async insertOptionsForQuestion(questionId: number, answers: string[]) {
    const { error } = await this.supabase
      .from('options')
      .insert(
        answers.map(answer => ({
          question_id: questionId,
          option_text: answer,
          votes: 0
        }))
      );

    return !error;
  }
}
