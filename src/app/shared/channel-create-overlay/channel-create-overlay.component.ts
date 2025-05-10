import { Component, inject } from '@angular/core';
import { VariablesService } from '../../variables.service';
import {
  trigger,
  transition,
  style,
  animate,
  state,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../shared';
import { FirebaseService } from '../../shared/services/firebase.service';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-channel-create-overlay',
  standalone: true,
  imports: [CommonModule, MatDialogModule, SharedModule, FormsModule],
  templateUrl: './channel-create-overlay.component.html',
  styleUrl: './channel-create-overlay.component.scss',
  animations: [
    trigger('channelCreateOverlayAnimation', [
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
        animate('0.2s ease-out'),
      ]),
      transition('open => close', [
        animate('0.2s ease-out', style({ transform: 'scale(0)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class ChannelCreateOverlayComponent {
  channelName: string = '';
  description: string = '';
  formInvalid: boolean = false;

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private variableService: VariablesService = inject(VariablesService);
  private dialogRef = inject(MatDialogRef<ChannelCreateOverlayComponent>);

  channelCreateOverlayAnimation: 'open' | 'close' = 'close';

  constructor() { }

  ngOnInit() {
    this.dialogRef.afterOpened().subscribe(() => {
      this.startAnimation();
    });
  }

  checkFormInvalid() {
    if (this.channelName === '') {
      this.formInvalid = false;
    } else {
      this.formInvalid = true;
    }
  }
  

  /**
   * Creates a new channel with the given name and description and adds the
   * current user as the channel creator.
   *
   * @remarks
   * Checks if the channel name is not empty and if the user is logged in.
   * If the channel name is empty, sets the form invalid to false.
   * If the user is not logged in, logs an error.
   * Otherwise, calls the createChannel function from the FirebaseService and
   * notifies the application that a new channel was created via the
   * VariablesService. When the channel is created, closes the dialog.
   */
  createChannel() {
    const currentUserUid = this.authService.getCurrentUserUID();
    const trimmedChannelName = this.channelName.trim();

    if (!trimmedChannelName) {
      console.warn('Channel-Name darf nicht leer sein.');
      return;
    }

    if (currentUserUid) {
      this.firebaseService
        .createChannel(trimmedChannelName, this.description, currentUserUid)
        .subscribe({
          next: () => {
            this.variableService.notifyChannelCreated();
            this.closeDialog();
          },
          error: (error) => {
            console.error('Fehler beim Erstellen des Channels:', error);
          },
        });
    } else {
      console.error(
        'Fehler: Benutzer nicht angemeldet, kann keinen Channel erstellen.'
      );
    }
  }

  startAnimation() {
    this.channelCreateOverlayAnimation = 'open';
  }

  closeDialog() {
    this.channelCreateOverlayAnimation = 'close';
    setTimeout(() => {
      if (this.dialogRef) {
        this.dialogRef.close();
      } else {
        console.error(
          'DialogRef ist nicht verfügbar in ChannelCreateOverlayComponent'
        );
      }
    }, 100);
  }
}
