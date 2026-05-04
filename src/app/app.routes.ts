import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { Poll } from './shared/poll/poll';
import { CreatePoll } from './shared/create-poll/create-poll';

export const routes: Routes = [
    {path: "", component: LandingPage},
    {path: "poll/:id", component: Poll},
    {path: "create", component: CreatePoll}
];
