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

@Component({
  selector: 'app-channel-create-overlay',
  standalone: true,
  imports: [CommonModule, MatDialogModule, SharedModule],
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

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);

  channelCreateOverlayAnimation: 'open' | 'close' = 'close';

  constructor(
    private variableService: VariablesService,
    private dialogRef: MatDialogRef<ChannelCreateOverlayComponent>
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
  }

  createChannel() {
    const currentUserUid = this.authService.getCurrentUserUID();
    if (currentUserUid) {
      this.firebaseService
        .createChannel(this.channelName, this.description, currentUserUid)
        .subscribe({
          next: (channelKey) => {
            console.log('Channel erstellt mit Key:', channelKey);
          },
          error: (error) => {
            console.error('Fehler beim Erstellen des Channels:', error);
          },
        });
    } else {
      console.error('Kein Benutzer eingeloggt, kann keinen Channel erstellen.');
    }
  }

  startAnimation() {
    this.channelCreateOverlayAnimation = 'open';
  }

  closeDialog() {
    this.channelCreateOverlayAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close(ChannelCreateOverlayComponent);
    }, 100);
  }

  closeAddChannelOverlay() {
    this.variableService.toggleAddChannelOverlay();
  }
}
