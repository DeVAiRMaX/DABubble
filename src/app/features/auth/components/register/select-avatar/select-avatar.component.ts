import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import avatars from './avatars.json';
import { SharedModule } from '../../../../../shared';
import { FirebaseService } from '../../../../../shared/services/firebase.service';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { User } from '../../../../../shared/interfaces/user';
import { AuthService } from '../../../../../shared/services/auth.service';
import { Observable } from 'rxjs';
import { VariablesService } from '../../../../../variables.service';

@Component({
  selector: 'app-select-avatar',
  standalone: true,
  imports: [RouterLink, CommonModule, SharedModule],
  templateUrl: './select-avatar.component.html',
  styleUrl: './select-avatar.component.scss',
  animations: [
    trigger('successMsgAnimation', [
      transition(':enter', [
        style({
          transform: 'translateX(50%)',
          opacity: 0,
        }),
        animate(
          '250ms ease-in',
          style({
            transform: 'translateX(0)',
            opacity: 1,
          })
        ),
      ]),
    ]),
  ],
})
export class SelectAvatarComponent {
  avatars = avatars.avatarimg;
  selectedAvatar: string = this.avatars[0];
  successMsgAnimation: boolean = false;
  id: any = '';
  displayName: string | null = null;

  private router = inject(Router);
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private variablesService = inject(VariablesService);
  user$: Observable<User | null>;

  constructor() {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    this.avatars = avatars.avatarimg;
    this.renderData();
  }

  renderData() {
    let currentUser = this.authService.getCurrentUser();
  }

  updateAvatar(choosenAvatar: string) {
    let uid = this.authService.getCurrentUserUID();
    if (uid) {
      this.selectedAvatar = choosenAvatar;
      this.firebaseService
        .updateAvatar(choosenAvatar, uid)
        .then(() => {
          this.successMsgAnimation = true;
          setTimeout(() => {
            if (this.variablesService.googleLogin) {
              this.router.navigate([`/dashboard`]);
              this.variablesService.toggleLoginStatus();
            } else {
              this.router.navigate([`/login`]);
            }
            this.successMsgAnimation = false;
          }, 2000);
        })
        .catch((error) => {
          console.error('Error updating avatar:', error);
        });
    }
  }
}
