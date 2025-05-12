import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../../shared';
import { User } from '../../interfaces/user';
import { VariablesService } from '../../../variables.service';
import { ChannelCreateOverlayComponent } from '../../channel-create-overlay/channel-create-overlay.component';

@Component({
  selector: 'app-channel-members-overlay',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './channel-members-overlay.component.html',
  styleUrl: './channel-members-overlay.component.scss',
})
export class ChannelMembersOverlayComponent {
  userDontBeEmpty: boolean = false;

  channelMembers: any[] = [];
  channelMember: any[] = [];

  @Output() childEvent = new EventEmitter<void>();

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  public variableService: VariablesService = inject(VariablesService);
  private dialogRef = inject(MatDialogRef<ChannelCreateOverlayComponent>);
  public data: any = inject(MAT_DIALOG_DATA);

  constructor() {}

  ngOnInit(): void {
    if (this.data && this.data.channelMember) {
      this.getMembersData(this.data.channelMember);
    } else {
      console.error(
        'ChannelMembersOverlayComponent: MAT_DIALOG_DATA or data.channelMember is not available'
      );
    }
  }

  async getMembersData(channelMembers: any[]) {
    const membersAsStrings: string[] = channelMembers.map((member) => {
      if (typeof member === 'object' && member.uid) {
        return member.uid;
      }
      return String(member);
    });

    const rawMembers: any[] = await this.authService.getMembersData(
      membersAsStrings
    );

    this.channelMember = rawMembers.map((member: any): User => {
      return {
        uid: member?.uid || '',
        displayName: member?.displayName || null,
        email: member?.email || null,
        avatar: member?.avatar,
        channelKeys: member?.channelKeys || [],
      };
    });
  }

  async removeMember(uid: string) {
    const index = this.channelMember.findIndex((member) => member.uid === uid);
    if (this.channelMember.length === 1) {
      this.userDontBeEmpty = true;
      return;
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
