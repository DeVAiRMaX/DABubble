import { Component, inject } from '@angular/core';
import avatars from './../../../../../features/auth/components/register/select-avatar/avatars.json';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-profile-pics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-pics.component.html',
  styleUrl: './profile-pics.component.scss'
})
export class ProfilePicsComponent {

  private dialogRef = inject(MatDialogRef<ProfilePicsComponent>);

  avatars = avatars.avatarimg;

  printAvatar(avatar: string){
   const newAvatar = avatar;
   this.dialogRef.close(newAvatar);
   
  }

}
