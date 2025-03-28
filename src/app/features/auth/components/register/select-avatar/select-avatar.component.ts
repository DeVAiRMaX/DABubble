import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import avatars from './avatars.json';
import { SharedModule } from '../../../../../shared';
import { FirebaseService } from '../../../../../shared/services/firebase.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { newUserData } from '../../../../../classes/register.class'


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
          opacity: 0
        }),
        animate('250ms ease-in', style({
          transform: 'translateX(0)',
          opacity: 1
        }))
      ])
    ]),
  ]
})
export class SelectAvatarComponent {
  avatars = avatars.avatarimg;
  selectedAvatar: string = this.avatars[0];
  successMsgAnimation: boolean = false;
  id: any = '';
  displayName: string | null = null;

  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);



  ngOnInit() {
    this.avatars = avatars.avatarimg;
    this.renderUserData();
  }

  renderUserData() {
    this.id = this.route.snapshot.paramMap.get('id');
    
    this.firebaseService.resiveUserData(this.id)
      .then(displayName => {
        this.displayName = displayName;
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
      });
  }


  updateAvatar(choosenAvatar: string) {
    this.selectedAvatar = choosenAvatar;

    this.firebaseService.updateAvatar(choosenAvatar, this.id)
      .then(() => {
        this.successMsgAnimation = true;
        setTimeout(() => {
          this.router.navigate([`/login`]);
          this.successMsgAnimation = false;
        }, 2000);
      })
      .catch(error => {
        console.error('Error updating avatar:', error);
      });
  }


}
