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
  .select('*')
  this.pollList.set((response.data ?? []) as Poll[]);
  console.log(response);
  
  }
}
