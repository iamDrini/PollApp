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
    // Für jede ausgewählte Option die votes um 1 erhöhen
    const promises = optionIds.map(optionId => 
      this.supabase.rpc('increment_votes', { option_id: optionId })
    );
    
    // Alternativ: Falls RPC nicht verfügbar ist, verwende UPDATE
    const updatePromises = optionIds.map(async optionId => {
      // Hole aktuelle votes
      const { data } = await this.supabase
        .from('options')
        .select('votes')
        .eq('id', optionId)
        .single();
      
      // Erhöhe votes um 1
      return this.supabase
        .from('options')
        .update({ votes: (data?.votes ?? 0) + 1 })
        .eq('id', optionId);
    });
    
    await Promise.all(updatePromises);
  }
}
