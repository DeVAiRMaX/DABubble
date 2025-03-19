import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import avatars from './avatars.json';

@Component({
  selector: 'app-select-avatar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './select-avatar.component.html',
  styleUrl: './select-avatar.component.scss'
})
export class SelectAvatarComponent {
  avatars = avatars.avatarimg;
  selectedAvatar: string = this.avatars[0];

  ngOnInit() {
    this.avatars = avatars.avatarimg;
  }
}
