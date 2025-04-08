import { Component, Inject, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../interfaces/channel';
import { SharedModule } from '../../../shared';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../interfaces/user';

@Component({
  selector: 'app-edit-channel',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './edit-channel.component.html',
  styleUrl: './edit-channel.component.scss',
  animations: [
    trigger('editChannelAnimation', [
      state('open', style({
        transform: 'scale(1)',
        opacity: 1,
      })),
      state('close', style({
        transform: 'scale(0)',
        opacity: 0,
      })),
      transition('close => open', [
        style({ transform: 'scale(0)', opacity: 0 }),
        animate('0.2s ease-out')
      ]),
      transition('open => close', [
        animate('0.2s ease-out',
          style({ transform: 'scale(0)', opacity: 0 })
        )
      ])
    ])
  ]
})
export class EditChannelComponent {

  editChannelAnimation: 'open' | 'close' = 'close';
  editChannelName: boolean = false;
  editChannelDescription: boolean = false;

  channelName: string = '';
  channelDescription: string = '';

  channelData: string = '';

  channelCreator: string | null = '';


  channel$: Observable<Channel | null>;
  user$: Observable<User | null>;

  private databaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<EditChannelComponent>, @Inject(MAT_DIALOG_DATA) public data: { channelKey: string }) {
    this.user$ = this.authService.user$;
    this.channel$ = this.databaseService.getChannel(this.data.channelKey);

  }

  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
    this.getChannelData();
  }

  getChannelData() {
    this.databaseService.getChannel(this.data.channelKey)
      .subscribe(channel => {
        const channelDataJson = channel as Channel;
        this.findUser(channelDataJson.members[0]);
      });
  }

  async findUser(channelCreatorUid: string) {
    try {
      const displayName = await this.databaseService.findUser(channelCreatorUid);
      this.channelCreator = displayName;
    } catch (error) {
      console.error("Fehler:", error);
    }
  }

  startAnimation() {
    this.editChannelAnimation = 'open';
  }

  closeDialog() {
    this.editChannelAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close();
    }, 150);
  }

  async saveChannelName() {
    if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(this.data.channelKey, 'channelName', this.channelName);
        this.channel$ = this.databaseService.getChannel(this.data.channelKey);
      } catch (error) {
        console.error('Error updating channel name:', error);
      }
    } else {
      console.error('Current channel not found.');
    }
  }

  async saveChannelDescription() {
    if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(this.data.channelKey, 'description', this.channelDescription);
        this.channel$ = this.databaseService.getChannel(this.data.channelKey);
      } catch (error) {
        console.error('Error updating channel name:', error);
      }
    } else {
      console.error('Current channel not found.');
    }
  }

  onToggleOrSaveChannelDescription(): void {
    if (!this.editChannelDescription) {
      this.saveChannelDescription();
      this.editChannelDescription = false;
    } else {
      this.editChannelDescription = true;
    }
  }


}
