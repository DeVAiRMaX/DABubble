import { Component, Inject, inject, OnDestroy } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { FirebaseService } from '../../services/firebase.service';
import { Channel } from '../../interfaces/channel';
import { SharedModule } from '../../../shared';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../interfaces/user';
import { VariablesService } from '../../../variables.service';

@Component({
  selector: 'app-edit-channel',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './edit-channel.component.html',
  styleUrl: './edit-channel.component.scss',
  animations: [
    trigger('editChannelAnimation', [
      state(
        'open',
        style({
          transform: 'scale(1)',
          opacity: 1,
        })
      ),
      state(
        'close',
        style({
          transform: 'scale(0)',
          opacity: 0,
        })
      ),
      transition('close => open', [
        style({ transform: 'scale(0)', opacity: 0 }),
        animate('0.2s ease-out', style({ transform: 'scale(1)', opacity: 1 })),
      ]),
      transition('open => close', [
        animate('0.2s ease-out', style({ transform: 'scale(0)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class EditChannelComponent implements OnDestroy {
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

  private destroy$ = new Subject<void>();
  private currentUserUid: string | null = null;

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private variableService: VariablesService = inject(VariablesService);

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<EditChannelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { channelKey: string }
  ) {
    this.user$ = this.authService.user$;
    this.channel$ = this.firebaseService.getChannel(this.data.channelKey);

    this.authService.uid$.pipe(takeUntil(this.destroy$)).subscribe((uid) => {
      this.currentUserUid = uid;
    });
  }

  ngOnInit() {
    this.dialogRef.afterOpened().subscribe(() => {
      this.startAnimation();
    });
    this.getChannelData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startAnimation() {
    this.editChannelAnimation = 'open';
  }

  getChannelData() {
    this.firebaseService
      .getChannel(this.data.channelKey)
      .subscribe((channel) => {
        const channelDataJson = channel as Channel;
        this.findUser(channelDataJson.members[0]);
      });
  }

  async findUser(channelCreatorUid: string) {
    try {
      this.channelCreator = await this.firebaseService.findUser(
        channelCreatorUid
      );
    } catch (error) {
      console.error('Fehler:', error);
    }
  }

  async saveChannelName() {
    if (this.channelName === '') {
      this.channelNameEmpty = true;
      return;
    } else if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(
          this.data.channelKey,
          'channelName',
          this.channelName
        );
        this.channel$ = this.firebaseService.getChannel(this.data.channelKey);

        this.editChannelName = false;
        this.channelNameEmpty = false;
        this.variableService.notifyChannelNameChanged();
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
    if (this.data.channelKey) {
      try {
        await this.authService.updateChannel(
          this.data.channelKey,
          'description',
          this.channelDescription
        );
        this.channel$ = this.firebaseService.getChannel(this.data.channelKey);

        this.editChannelDescription = false;
        this.channelDescriptionEmpty = false;
      } catch (error) {
        console.error('Error updating channel name:', error);
      }
    } else {
      console.error('Current channel not found.');
    }
  }

  async leaveChannel(): Promise<void> {
    if (!this.currentUserUid) {
      console.error(
        'Benutzer-UID nicht gefunden. Kann Channel nicht verlassen.'
      );
      return;
    }
    if (!this.data.channelKey) {
      console.error(
        'Channel-Key nicht gefunden. Kann Channel nicht verlassen.'
      );
      return;
    }

    try {
      await this.firebaseService.removeUserChannel(
        this.data.channelKey,
        this.currentUserUid
      );
      this.closeDialog();
      this.variableService.notifyUserLeavedChannel();
    } catch (error) {
      console.error(
        `Fehler beim Verlassen des Channels ${this.data.channelKey}:`,
        error
      );
    }
  }

  closeDialog() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();

      // UND: Kurzzeitig Fokus auf "unsichtbares" Dummy-Element legen
      const tempFocusable = document.createElement('button');
      tempFocusable.style.position = 'absolute';
      tempFocusable.style.opacity = '0';
      tempFocusable.style.pointerEvents = 'none';
      document.body.appendChild(tempFocusable);
      tempFocusable.focus();
      document.body.removeChild(tempFocusable);
    }

    this.editChannelAnimation = 'close';

    setTimeout(() => {
      this.dialogRef.close();
    }, 150);
  }
}
