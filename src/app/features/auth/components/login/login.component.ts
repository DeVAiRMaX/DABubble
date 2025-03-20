import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('logoAnimation', [
      state(
        'center',
        style({
          transform: 'translateX(50%)',
        })
      ),
      state(
        'left',
        style({
          transform: 'translateX(0%)',
        })
      ),
      transition('center => left', [animate('0.4s ease-out')]),
    ]),
    trigger('textAnimation', [
      state(
        'visible',
        style({
          transform: 'translateY(0)',
          opacity: 1,
        })
      ),
      state(
        'hidden',
        style({
          transform: 'translateY(300%)',
          opacity: 0,
        })
      ),
      transition('hidden => visible', [animate('0.5s 0.7s ease-out')]),
    ]),
    trigger('ContainerAnimation', [
      state(
        'center',
        style({
          opacity: 1,
        })
      ),
      state(
        'leftTop',
        style({
          transform: 'translateX(-200%) translateY(-240%) scale(0.5)',
          opacity: 0,
        })
      ),
      transition('center => leftTop', [animate('1.2s ease-out')]),
    ]),
    trigger('BackgroundAnimation', [
      state(
        'visible',
        style({
          opacity: 1,
        })
      ),
      state(
        'hidden',
        style({
          opacity: 0,
          display: 'none',
        })
      ),
      transition('visible => hidden', [animate('0.5s ease-out')]),
    ]),
    trigger('loginContainerAnimation', [
      state(
        'hidden',
        style({
          opacity: 0,
          display: 'none',
        })
      ),
      state(
        'visible',
        style({
          opacity: 1,
          display: 'flex',
        })
      ),
      transition('hidden => visible', [animate('0.65s ease-out')]),
    ]),
  ],
})
export class LoginComponent implements OnInit {
  private authService: AuthService = inject(AuthService);

  logoState: 'center' | 'left' = 'center';
  textState: 'hidden' | 'visible' = 'hidden';
  ContainerState: 'center' | 'leftTop' = 'center';
  BackgroundState: 'visible' | 'hidden' = 'visible';
  loginContainerState: 'hidden' | 'visible' = 'hidden';

  ngOnInit(): void {
    this.startAnimation();
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  startAnimation(): void {
    this.logoState = 'center';
    this.textState = 'hidden';
    this.ContainerState = 'center';

    setTimeout(() => {
      this.logoState = 'left';
    }, 500);

    setTimeout(() => {
      this.textState = 'visible';
    }, 500);

    setTimeout(() => {
      this.ContainerState = 'leftTop';
    }, 2300);

    setTimeout(() => {
      this.BackgroundState = 'hidden';
    }, 3000);

    setTimeout(() => {
      this.loginContainerState = 'visible';
    }, 3500);
  }
}
