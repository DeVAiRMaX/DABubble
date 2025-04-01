import {
  Component,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { VariablesService } from '../../variables.service';

import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
} from '@angular/material/dialog';
import { ChannelMembersOverlayComponent } from './channel-members-overlay/channel-members-overlay.component';
import { ChannelWithKey } from '../interfaces/channel';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    AddUserToChannelOverlayComponent,
    CommonModule,
    MatDialogModule,
    SharedModule,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
})
export class ChannelChatComponent implements OnInit, OnChanges {
  addUserToChannelOverlayIsVisible: boolean = false;
  lastInputValue: string = '';
  
  @Input() channel!: ChannelWithKey;
  private variableService: VariablesService = inject(VariablesService);

  constructor(private dialog: MatDialog) {
    this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
      (value) => {
        this.addUserToChannelOverlayIsVisible = value;
      }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      const currentChannel = changes['channel'].currentValue as ChannelWithKey;
      console.log(
        'ChannelChatComponent ngOnChanges - Channel erhalten:',
        currentChannel.channelName,
        'mit Key:',
        currentChannel.key
      );
    } else if (
      changes['channel'] &&
      !changes['channel'].currentValue &&
      !changes['channel'].firstChange
    ) {
      console.warn(
        'ChannelChatComponent ngOnChanges - Channel wurde entfernt oder ist undefined.'
      );
    }
  }

  ngOnInit(): void {
    if (this.channel) {
      console.log(
        'ChannelChatComponent ngOnInit - Channel war bereits verfügbar:',
        this.channel.channelName,
        'mit Key:',
        this.channel.key
      );
    } else {
      console.warn(
        'ChannelChatComponent ngOnInit - Channel war bei ngOnInit noch nicht verfügbar.'
      );
    }
  }

  toggleAddUserToChannelOverlay() {
    this.variableService.toggleAddUserToChannelOverlay();
    console.log(this.addUserToChannelOverlayIsVisible);
  }

  toggleThread() {
    if (this.variableService['isClosedSubject'].value) {
      this.variableService.toggleThread();
    }
  }

  openEditChannelDialog() {
    this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
    });
  }

  openAddUserToChannelDialog() {
    const targetElement = document.querySelector('.add_btn_user');

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect(); // Position des Buttons ermitteln

      const dialogRef = this.dialog.open(AddUserToChannelOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: 'custom-dialog', // 20px Abstand nach unten
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          const newLeft = rect.right - dialogRect.width + window.scrollX;

          dialogElement.style.left = `${newLeft}px`;
          dialogElement.style.position = 'absolute';
          dialogElement.style.maxWidth = '515px';
          dialogElement.style.maxHeight = '295px';
        }
      }, 0);
    }
  }

  openChannelMembersDialog() {
    const targetElement = document.querySelector(
      '.channel-chat-header-right-user-container'
    );

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect(); // Position des Buttons ermitteln

      const dialogRef = this.dialog.open(ChannelMembersOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` }, 
        panelClass: ['custom-dialog', 'memberOverlay'] , // 20px Abstand nach unten
      });

      dialogRef.componentInstance.childEvent.subscribe(() => {
        this.openAddUserToChannelDialog();
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          const newLeft = rect.right - dialogRect.width + window.scrollX;

          dialogElement.style.left = `${newLeft}px`;
          dialogElement.style.position = 'absolute';
          dialogElement.style.maxWidth = '415px';
          dialogElement.style.height = '700px';
        }
      }, 20); 
    }
  }

  openTagPeopleDialog(){
    const targetElement = document.querySelector('.input-container-wrapper');
    const inputfield = document.querySelector('.textForMessageInput') as HTMLInputElement;
    const inputValue = inputfield?.value || '';

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect(); // Position des Buttons ermitteln

      const dialogRef = this.dialog.open(TaggingPersonsDialogComponent, {
        position: { bottom: `${rect.top - 20 + window.scrollY}px` ,
         left: `${rect.left + 20 + window.scrollX}px`},
        panelClass: ['tagging-dialog'], 
        backdropClass: 'transparentBackdrop',
        autoFocus: false,
       
       
      });
      
      
     
      
      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          

          
          dialogElement.style.position = 'absolute';
          dialogElement.style.width = '350px';
          
          dialogElement.style.borderBottomLeftRadius = '0px';
          
        }
      }, 10);
      setTimeout(() => {
        const inputField = document.querySelector('.textForMessageInput') as HTMLElement;
        if(inputField){
          inputField.focus();
          console.log('focus back on it')
        }
      }, 400);
    }
   
  }
  
  
  checkForMention(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.value.includes('@') && !this.lastInputValue.includes('@')) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value; // Speichert den aktuellen Wert des gesamten Inputfelds
   this.variableService.setNameToFilter(this.lastInputValue);
  }
  
  
}
