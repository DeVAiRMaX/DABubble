import { Component, Output, EventEmitter, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../../shared';
import { User } from '../../interfaces/user';


@Component({
  selector: 'app-channel-members-overlay',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './channel-members-overlay.component.html',
  styleUrl: './channel-members-overlay.component.scss'
})
export class ChannelMembersOverlayComponent {
  userDontBeEmpty: boolean = false;

  channelMembers: any[] = [];
  channelMember: any[] = [];

  @Output() childEvent = new EventEmitter<void>();

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);

  constructor(private dialogRef: MatDialogRef<ChannelMembersOverlayComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {

    this.getMembersData(this.data.channelMember);
  }

  async getMembersData(channelMembers: any[]) {
    const membersAsStrings: string[] = channelMembers.map(member => {
      if (typeof member === 'object' && member.uid) {
        return member.uid;
      }
      return String(member);
    });

    const rawMembers: any[] = await this.authService.getMembersData(membersAsStrings);

    this.channelMember = rawMembers.map((member: any): User => {
      return {
        uid: member?.uid || '',
        displayName: member?.displayName || null,
        email: member?.email || null,
        avatar: member?.avatar,
        channelKeys: member?.channelKeys || []
      };
    });
  }

  async removeMember(uid: string) {
    const index = this.channelMember.findIndex(member => member.uid === uid)
    if (this.channelMember.length === 1) {
      this.userDontBeEmpty = true;
      return
    }

    if (index > -1) {
      await this.firebaseService.removeUserChannel(this.data.channelKey, uid);
      this.channelMember.splice(index, 1);
    }
  }




  async closeDialog() {

    this.dialogRef.close(ChannelMembersOverlayComponent);

  }

  async openAddUserToChannelDialog() {
    await this.closeDialog();
    setTimeout(() => {
      this.childEvent.emit();
    }, 200);
  }
}
