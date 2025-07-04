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
  channelList: string[] = [];
  channelNameExists: boolean = false;

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private variableService: VariablesService = inject(VariablesService);
  private dialogRef = inject(MatDialogRef<ChannelCreateOverlayComponent>);

  channelCreateOverlayAnimation: 'open' | 'close' = 'close';

  constructor() {}

  ngOnInit() {
    this.dialogRef.afterOpened().subscribe(() => {
      this.startAnimation();
    });
  }

  checkFormInvalid() {
    if (this.channelName.trim() === '') {
      this.formInvalid = false;
    } else {
      this.formInvalid = true;
    }
  }

  async getChannelNames() {
   await this.firebaseService.getChannelNames();
    this.channelList = this.firebaseService.channelListDatabase;
  
    

  }

  async createChannel() {
    this.channelNameExists = false;
    const currentUserUid = this.authService.getCurrentUserUID();
    const trimmedChannelName = this.channelName.trim();
    await this.getChannelNames();
    await this.checkIfChannelDoubles(trimmedChannelName);
    if (!trimmedChannelName || this.channelNameExists) {
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
  if (document.activeElement instanceof HTMLElement) {
  document.activeElement.blur();}
  const trap = document.getElementsByClassName('header-search')[0] as HTMLElement;
  trap?.focus(); // Fokus liegt jetzt *nicht* im app-root

  this.channelCreateOverlayAnimation = 'close';

  setTimeout(() => {
    this.dialogRef?.close();
  }, 100);
}






  checkIfChannelDoubles(name: string){

    const lowerCaseName = name.toLowerCase();
    const duplicateExists = this.channelList.some(
      channel => channel.toLowerCase() === lowerCaseName
    );

    if(duplicateExists){
     
      this.channelNameExists = true;
    }
  
}
}
