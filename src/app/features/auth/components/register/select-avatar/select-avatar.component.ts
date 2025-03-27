import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import avatars from './avatars.json';
import { SharedModule } from '../../../../../shared';
import { FirebaseService } from '../../../../../shared/services/firebase.service';

@Component({
  selector: 'app-select-avatar',
  standalone: true,
  imports: [RouterLink, CommonModule, SharedModule],
  templateUrl: './select-avatar.component.html',
  styleUrl: './select-avatar.component.scss'
})
export class SelectAvatarComponent {
  avatars = avatars.avatarimg;
  selectedAvatar: string = this.avatars[0];

  private readonly route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);



  ngOnInit() {
    this.avatars = avatars.avatarimg;
  }

  updateAvatar(choosenAvatar: string) {
    this.selectedAvatar = choosenAvatar;
    const id = this.route.snapshot.paramMap.get('id');
    console.log(id);
    return
    this.firebaseService.updateAvatar(choosenAvatar);

  }

}
