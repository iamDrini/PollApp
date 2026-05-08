import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Poll } from './interfaces/interface';

@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  
  supabase = createClient('https://xixqyrgjdjkoxayonpqr.supabase.co', 'sb_publishable_ho3A-byQYtg4hs_q8jtzCg_4yrPe2cn');

  pollList = signal<Poll[]>([]);
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
  console.log(response);
  
  }

  setPollDetailById(id:number){
    let tmpPoll = this.pollList().find(poll => poll.id == id)
    if(tmpPoll) this.pollDetail.set(tmpPoll);
  }

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

  async submitVotes(optionIds: number[]) {
    const promises = optionIds.map(optionId => 
      this.supabase.rpc('increment_votes', { option_id: optionId })
    );
    const updatePromises = optionIds.map(async optionId => {
      const { data } = await this.supabase
        .from('options')
        .select('votes')
        .eq('id', optionId)
        .single();
      return this.supabase
        .from('options')
        .update({ votes: (data?.votes ?? 0) + 1 })
        .eq('id', optionId);
    });
    
    await Promise.all(updatePromises);
  }

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
      const { data: poll, error: pollError } = await this.supabase
        .from('polls')
        .insert({
          title: pollData.title,
          subtitle: pollData.subtitle,
          category: pollData.category,
          ends_at: pollData.ends_at
        })
        .select()
        .single();

      if (pollError || !poll) {
        console.error('Error inserting poll:', pollError);
        return { success: false, error: pollError };
      }
      const { data: questions, error: questionsError } = await this.supabase
        .from('questions')
        .insert(
          pollData.questions.map(q => ({
            poll_id: poll.id,
            question_text: q.question_text,
            allow_multiple: q.allow_multiple
          }))
        )
        .select();

      if (questionsError || !questions) {
        console.error('Error inserting questions:', questionsError);
        return { success: false, error: questionsError };
      }
      for (let i = 0; i < questions.length; i++) {
        const { error: optionsError } = await this.supabase
          .from('options')
          .insert(
            pollData.questions[i].answers.map(answer => ({
              question_id: questions[i].id,
              option_text: answer,
              votes: 0
            }))
          );

        if (optionsError) {
          console.error('Error inserting options:', optionsError);
          return { success: false, error: optionsError };
        }
      }
      await this.getAllPolls();

      return { success: true, pollId: poll.id };
    } catch (error) {
      console.error('Unexpected error in addPoll:', error);
      return { success: false, error };
    }
  }
}
