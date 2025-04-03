import {
  Component,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
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
import { SubService } from '../services/sub.service';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [CommonModule, MatDialogModule, SharedModule],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
})
export class ChannelChatComponent implements OnInit, OnChanges, OnDestroy {
  addUserToChannelOverlayIsVisible: boolean = false;
  lastInputValue: string = '';

  @Input() channel!: ChannelWithKey;
  private variableService: VariablesService = inject(VariablesService);
  private subService: SubService = inject(SubService);
  private dialog: MatDialog = inject(MatDialog);
  private readonly SUB_GROUP_NAME = 'channelChatSubs';

  taggedPersonsInChat = this.variableService.getTaggedContactsFromChat();
  taggedPerson: any;

  constructor() {
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

    // const threadIsClosed = this.variableService.sideNavIsVisible$.subscribe(
    //   (isVisibleValue) => {
    //     if (this.variableService.threadIsClosed$ === false) {
    //       this.threadIsClosed = isVisibleValue;
    //       this.threadIsClosed.toggleThread();
    //     }
    //   }
    // );

    const overlayVisibilitySub =
      this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
        (value) => {
          this.addUserToChannelOverlayIsVisible = value;
        }
      );

    this.subService.add(overlayVisibilitySub, this.SUB_GROUP_NAME);
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
  }

  toggleAddUserToChannelOverlay() {
    this.variableService.toggleAddUserToChannelOverlay();
  }

  toggleThread() {
    const value = this.variableService['isClosedSubject']?.value;

    if (value !== undefined && value !== null) {
      this.variableService.toggleThread();
    }
  }

  openEditChannelDialog() {
    const dialogRef = this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
      data: { channelKey: this.channel?.key },
    });
  }

  openAddUserToChannelDialog() {
    const targetElement = document.querySelector('.add_btn_user');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(AddUserToChannelOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: 'custom-dialog',
        data: { channelKey: this.channel?.key },
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
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(ChannelMembersOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: ['custom-dialog', 'memberOverlay'],
        data: { channelKey: this.channel?.key },
      });
      const childEventSub = dialogRef.componentInstance.childEvent.subscribe(
        () => {
          this.openAddUserToChannelDialog();
        }
      );

      this.subService.add(childEventSub, this.SUB_GROUP_NAME);

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

  openTagPeopleDialog() {
    const targetElement = document.querySelector('.input-container-wrapper');
    const inputfield = document.querySelector(
      '.textForMessageInput'
    ) as HTMLElement;
    const inputValue = inputfield?.innerText.trim() || '';

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(TaggingPersonsDialogComponent, {
        position: {
          bottom: `${rect.top - 20 + window.scrollY}px`,
          left: `${rect.left + 20 + window.scrollX}px`,
        },
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
        const inputField = document.querySelector(
          '.textForMessageInput'
        ) as HTMLElement;
        if (inputField) {
          inputField.focus();
        }
      }, 400);
    }
  }

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLElement;
    const inputText = inputElement.innerText.trim();
    if (
      inputText.includes('@') &&
      !this.lastInputValue.includes('@') &&
      inputElement.innerText !== ''
    ) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputText; // Speichert den aktuellen Wert des gesamten Inputfelds
    this.variableService.setNameToFilter(this.lastInputValue);
    console.log(this.taggedPersonsInChat);
    console.log(inputElement.innerText);
  }

  openTaggingPerClick(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '@';
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value;
    this.variableService.setNameToFilter(this.lastInputValue);
  }

  preventEdit(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  removePersonFromTagged() {
    console.log('person removed');
  }
}
