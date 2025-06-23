import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { AuthService } from '../../../../shared/services/auth.service';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../../../../variables.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('logoAnimation', [
      state('center', style({ transform: 'translateX(50%)' })),
      state('left', style({ transform: 'translateX(0%)' })),
      transition('center => left', [animate('0.4s ease-out')]),
    ]),
    trigger('logoFadeIn', [
      state('hidden', style({ opacity: 0 })),
      state('visible', style({ opacity: 1 })),
      transition('hidden => visible', [animate('0.6s ease-in')]),
    ]),
    trigger('textAnimation', [
      state('visible', style({ transform: 'translateY(0)', opacity: 1 })),
      state('hidden', style({ transform: 'translateY(300%)', opacity: 0 })),
      transition('hidden => visible', [animate('0.5s 0.7s ease-out')]),
    ]),
    trigger('ContainerAnimation', [
      state('center', style({ opacity: 1 })),
      state('leftTop', style({
        transform: 'translateX(-200%) translateY(-240%) scale(0.5)',
        opacity: 0,
      })),
      transition('center => leftTop', [animate('1.2s ease-out')]),
    ]),
    trigger('BackgroundAnimation', [
      state('visible', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0, display: 'none' })),
      transition('visible => hidden', [animate('0.5s ease-out')]),
    ]),
    trigger('loginContainerAnimation', [
      state('hidden', style({ opacity: 0, display: 'none' })),
      state('visible', style({ opacity: 1, display: 'flex' })),
      transition('hidden => visible', [animate('0.65s ease-out')]),
    ]),
    trigger('loginFeedbackFade', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' })),
  ]),
]),
    
  ],
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService: AuthService = inject(AuthService);
  private database: FirebaseService = inject(FirebaseService);
  private variableService = inject(VariablesService);
  private router = inject(Router);

  logoState: 'center' | 'left' | 'hidden' | 'visible' = 'center';
  logoAnimationTrigger = 'logoAnimation';

  textState: 'hidden' | 'visible' = 'hidden';
  ContainerState: 'center' | 'leftTop' = 'center';
  BackgroundState: 'visible' | 'hidden' = 'visible';
  loginContainerState: 'hidden' | 'visible' = 'hidden';

  userEmail: string = '';
  userPassword: string = '';
  isAboutToLogin : boolean = false;
  private subscription!: Subscription;
  
  loginError: string | null = null;

  ngOnInit(): void {
    this.setResponsiveAnimation();
    this.startAnimation();
    this.subscription = this.variableService.isAboutToLogin$.subscribe((status) => {
      this.isAboutToLogin = status;
    });

  }

  ngOnDestroy(): void {
    
    this.subscription.unsubscribe();
  }

  setResponsiveAnimation(): void {
    if (window.innerWidth <= 673) {
      this.logoAnimationTrigger = 'logoFadeIn';
      this.logoState = 'hidden';
    } else {
      this.logoAnimationTrigger = 'logoAnimation';
      this.logoState = 'center';
    }
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  startAnimation(): void {
    this.textState = 'hidden';
    this.ContainerState = 'center';

    setTimeout(() => {
      this.logoState = this.logoAnimationTrigger === 'logoFadeIn' ? 'visible' : 'left';
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

  async login(userEmail: string, userPassword: string) {
    this.loginError = null;
    try {
      await this.authService.loginWithEmailPassword(userEmail, userPassword);
    } catch (error: any) {
      console.error('Login fehlgeschlagen:', error);
      this.handleLoginError(error);
    }
  }

  private handleLoginError(error: any): void {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      this.loginError = 'E-Mail-Adresse oder Passwort ist ungültig.';
      console.log(this.loginError);
    }
  }
}
