import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { Poll } from './shared/poll/poll';

export const routes: Routes = [
    {path: "", component: LandingPage},
    {path: "poll/:id", component: Poll},
];
