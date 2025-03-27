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



  async ngOnInit() {
    this.avatars = avatars.avatarimg;
    this.id = this.route.snapshot.paramMap.get('id');    
    this.firebaseService.resiveUserData(this.id);
    this.displayName = await this.firebaseService.resiveUserData(this.id);
  }

  updateAvatar(choosenAvatar: string) {
    this.selectedAvatar = choosenAvatar;
    
    this.firebaseService.updateAvatar(choosenAvatar, this.id);
    this.successMsgAnimation = true;
    setTimeout(() => {
      this.router.navigate([`/login`])
      this.successMsgAnimation = false;
    }, 2000);
  }
}
