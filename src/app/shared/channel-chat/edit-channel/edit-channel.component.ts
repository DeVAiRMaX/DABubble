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
        animate('0.2s ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition('open => close', [
        animate('0.2s ease-out', style({ transform: 'scale(0)', opacity: 0 }))
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
  channelNameEmpty: boolean = false;
  channelDescriptionEmpty: boolean = false;

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
    this.dialogRef.afterOpened().subscribe(() => {
      this.startAnimation();
    });
    this.getChannelData();
  }

  startAnimation() {
    this.editChannelAnimation = 'open';
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
      this.channelCreator = await this.databaseService.findUser(channelCreatorUid);
    } catch (error) {
      console.error("Fehler:", error);
    }
  }

  async saveChannelName() {
    if (this.channelName === '') {
      this.channelNameEmpty = true;
      return
    } else if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(this.data.channelKey, 'channelName', this.channelName);
        this.channel$ = this.databaseService.getChannel(this.data.channelKey);

        this.editChannelName = false;
        this.channelNameEmpty = false;
      } catch (error) {
        console.error('Error updating channel name:', error);
      }
    } else {
      console.error('Current channel not found.');
    }
  }
  
  onToggleOrSaveChannelDescription(): void {
    if (this.editChannelDescription) {
      this.saveChannelDescription();
    } else {
      this.editChannelDescription = true;
    }
  }

  async saveChannelDescription() {
    // if (this.channelDescription === '') {
    //   this.channelDescriptionEmpty = true;
    //   return
    // }
    if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(this.data.channelKey, 'description', this.channelDescription);
        this.channel$ = this.databaseService.getChannel(this.data.channelKey);

        this.editChannelDescription = false;
        this.channelDescriptionEmpty = false;
      } catch (error) {
        console.error('Error updating channel name:', error);
      }
    } else {
      console.error('Current channel not found.');
    }
  }

  closeDialog() {
    this.editChannelAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close();
    }, 150);
  }
}
