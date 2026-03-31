import { Component } from '@angular/core';
import { HeroSection } from "../hero-section/hero-section";
import { Surveys } from "../surveys/surveys";

@Component({
  selector: 'app-landing-page',
  imports: [HeroSection, Surveys],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {

}
