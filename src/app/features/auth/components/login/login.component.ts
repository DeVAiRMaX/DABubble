import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  AnimationEvent,
} from '@angular/animations';

import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Router } from '@angular/router';

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
export class LoginComponent {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      if (result.user) {
        const user = result.user;
        const uid = user.uid;
        const displayName = user.displayName;
        const email = user.email;

        console.log('Benutzerdaten:', { uid, displayName, email });

        this.router.navigate(['/dashboard']);
      } else {
        // Fehlermeldung
        console.warn('Keinen Benutzer gefunden.');
      }
    } catch (error: any) {
      console.error('Fehler beim Anmelden mit Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        window.location.reload();
      }
      // Andere fehlercodes
    }
  }

  logoState: 'center' | 'left' = 'center';
  textState: 'hidden' | 'visible' = 'hidden';
  ContainerState: 'center' | 'leftTop' = 'center';
  BackgroundState: 'visible' | 'hidden' = 'visible';
  loginContainerState: 'hidden' | 'visible' = 'hidden';

  ngOnInit(): void {
    this.startAnimation();
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
