import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
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
import { Message } from '../interfaces/message';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';
import { SubService } from '../services/sub.service';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { Observable, of, Subscription } from 'rxjs';
import { User } from '../interfaces/user';

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
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;

  private variableService: VariablesService = inject(VariablesService);
  private subService: SubService = inject(SubService);
  private dialog: MatDialog = inject(MatDialog);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private readonly SUB_GROUP_NAME = 'channelChatSubs';
  private readonly SUB_MESSAGES = 'channelMessages';

  taggedPersonsInChat = this.variableService.getTaggedContactsFromChat();
  taggedPerson: any;

  messages$: Observable<Message[]> = of([]); // Observable für Nachrichten
  currentUser: User | null = null;

  constructor() {
    this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
      (value) => {
        this.addUserToChannelOverlayIsVisible = value;
      }
    );
  }

  ngOnInit(): void {
    const authSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      console.log('[ChannelChat] Current user set:', this.currentUser?.uid);
      this.cdRef.markForCheck();
      if (this.channel?.key && user) {
        this.loadMessages(this.channel.key);
      }
    });
    this.subService.add(authSub, this.SUB_GROUP_NAME);

    const overlayVisibilitySub =
      this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
        (value) => {
          this.addUserToChannelOverlayIsVisible = value;
        }
      );

    this.subService.add(overlayVisibilitySub, this.SUB_GROUP_NAME);
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
      if (currentChannel.key) {
        this.loadMessages(currentChannel.key);
      } else {
        console.warn(
          '[ChannelChat] Channel hat keinen Key, Nachrichten können nicht geladen werden.'
        );
        this.messages$ = of([]);
      }
    } else if (
      changes['channel'] &&
      !changes['channel'].currentValue &&
      !changes['channel'].firstChange
    ) {
      console.warn(
        'ChannelChatComponent ngOnChanges - Channel wurde entfernt oder ist undefined.'
      );

      this.subService.unsubscribeGroup(this.SUB_MESSAGES);
      this.messages$ = of([]);
      this.cdRef.markForCheck();
    }
  }

  loadMessages(channelKey: string): void {
    console.log(`[ChannelChat] Lade Nachrichten für Channel: ${channelKey}`);
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);

    this.messages$ = this.firebaseService.getMessagesForChannel(channelKey);
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);
  }

  sendMessage(): void {
    const messageText = this.messageInput.nativeElement.innerText.trim();

    if (
      !messageText ||
      !this.channel?.key ||
      !this.currentUser?.uid ||
      !this.currentUser?.displayName
    ) {
      console.warn('[sendMessage] Senden nicht möglich. Fehlende Daten:', {
        messageText,
        channelKey: this.channel?.key,
        currentUserUid: this.currentUser?.uid,
        currentUserDisplayName: this.currentUser?.displayName,
      });
      return;
    }

    this.firebaseService
      .sendMessage(
        this.channel.key,
        messageText,
        this.currentUser.uid,
        this.currentUser.displayName,
        this.currentUser.avatar
      )
      .subscribe({
        next: () => {
          console.log('[sendMessage] Nachricht erfolgreich gesendet.');
          this.messageInput.nativeElement.innerText = '';
          this.lastInputValue = '';
        },
        error: (err) => {
          console.error('[sendMessage] Fehler beim Senden:', err);
        },
      });
  }

  shouldShowDateDivider(
    currentMessage: Message,
    previousMessage: Message | null
  ): boolean {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.time);
    const previousDate = new Date(previousMessage.time);

    return currentDate.toDateString() !== previousDate.toDateString();
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

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(message: Message): boolean {
    return !!this.currentUser && message.senderUid === this.currentUser.uid;
  }

  openEditChannelDialog() {
    if (!this.channel?.key) return;
    const dialogRef = this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
      data: { channelKey: this.channel.key },
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
    const inputText = inputElement.innerText;
    if (
      inputText.includes('@') &&
      !this.lastInputValue.includes('@') &&
      inputText !== ''
    ) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputText;
    this.variableService.setNameToFilter(this.lastInputValue);
  }

  openTaggingPerClick(event: Event) {
    const targetIcon = event.target as HTMLElement;
    const inputDiv = this.messageInput.nativeElement;

    inputDiv.innerText += '@';

    inputDiv.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(inputDiv);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);

    this.lastInputValue = inputDiv.innerText;
    this.variableService.setNameToFilter(this.lastInputValue);
    this.openTagPeopleDialog();
  }

  preventEdit(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  removePersonFromTagged() {
    console.log('person removed');
  }
}
