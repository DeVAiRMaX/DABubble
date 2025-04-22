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
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { VariablesService } from '../../variables.service';

import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChannelMembersOverlayComponent } from './channel-members-overlay/channel-members-overlay.component';
import { ChannelWithKey } from '../interfaces/channel';
import { Message } from '../interfaces/message';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';
import { SubService } from '../services/sub.service';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { User } from '../interfaces/user';
import { SmileyKeyboardComponent } from './smiley-keyboard/smiley-keyboard.component';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    SharedModule,
    // SmileyKeyboardComponent,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChannelChatComponent implements OnInit, OnChanges, OnDestroy {
  addUserToChannelOverlayIsVisible: boolean = false;
  lastInputValue: string = '';
  activeThreadKey: string | null = null;
  channelUsers: any = [];
  channelMemberAvatars: any = [];

  @Input() channel!: ChannelWithKey;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;

  private variableService: VariablesService = inject(VariablesService);
  private subService: SubService = inject(SubService);
  private dialog: MatDialog = inject(MatDialog);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private savedRange: Range | null = null; // Variable zum Speichern des Bereichs (gio: was meinen?)
  private readonly SUB_GROUP_NAME = 'channelChatSubs';
  private readonly SUB_MESSAGES = 'channelMessages';

  taggedPersonsInChat = this.variableService.getTaggedContactsFromChat();
  taggedPerson: any;

  messages$: Observable<Message[]> = of([]);
  currentUser: User | null = null;
  channelMember: User | null = null;
  memberAvatars: string[] = [];

  constructor() {
    this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
      (value) => {
        this.addUserToChannelOverlayIsVisible = value;
      }
    );
  }

  ngOnInit(): void {
    const input = document.querySelector('.textForMessageInput') as HTMLElement;
    if (input) {
      input.addEventListener('mouseup', () => this.saveCursorPosition());
      input.addEventListener('keyup', () => this.saveCursorPosition());
    }
    const authSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
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

    this.getChannelMembers();
  }

  getChannelMembers() {
    this.firebaseService
      .getChannel(this.channel.key)
      .subscribe(async (user) => {
        if (user?.members && Array.isArray(user.members)) {
          console.log('Member IDs:', user.members);
          try {
            const membersData = await this.authService.getMembersData(
              user.members
            );

            this.channel.members = membersData;

            this.memberAvatars = membersData.map((member) => member.avatar);
          } catch (error) {
            console.error('Fehler beim Abrufen der Mitglieder:', error);
          }
        } else {
          console.log('Keine Mitglieder vorhanden oder ungültiges Format');
          this.channel.members = [];
          this.memberAvatars = [];
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      const currentChannel = changes['channel'].currentValue as ChannelWithKey;
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
    previousMessage: Message | null | undefined // Wichtig: auch undefined zulassen
  ): boolean {
    // Wenn es keine vorherige Nachricht gibt (also die erste Nachricht im Array),
    // zeige den Divider immer an.
    if (!previousMessage) {
      return true;
    }

    // Sicherstellen, dass Zeitstempel vorhanden und gültig sind
    if (!currentMessage?.time || !previousMessage?.time) {
      console.warn('Fehlender Zeitstempel für Datums-Divider-Prüfung.');
      // Entscheide, wie du diesen Fall behandeln möchtest.
      // 'false' zurückzugeben scheint hier sicherer, um Fehler zu vermeiden.
      return false;
    }

    try {
      const currentDate = new Date(currentMessage.time);
      const previousDate = new Date(previousMessage.time);

      // Prüfen, ob die erzeugten Daten gültig sind
      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        console.warn('Ungültiges Datum bei Datums-Divider-Prüfung.');
        return false;
      }

      // Vergleiche nur den Datumsanteil (Tag, Monat, Jahr)
      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (error) {
      console.error('Fehler beim Vergleichen der Daten für Divider:', error);
      return false; // Zeige keinen Divider bei einem Fehler
    }
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
          // dialogElement.style.maxHeight = '295px';
        }
      }, 0);
    }
  }

  async openChannelMembersDialog() {
    const channelData = await this.firebaseService
      .getChannel(this.channel?.key)
      .subscribe((user) => {
        this.channelUsers = user?.members;
      });

    const targetElement = document.querySelector(
      '.channel-chat-header-right-user-container'
    );
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(ChannelMembersOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: ['custom-dialog', 'memberOverlay'],
        data: {
          channelMember: this.channel.members,
          channelKey: this.channel.key,
        },
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

  startOrOpenThread(message: Message): void {
    if (!message || !message.key || !this.channel?.key || !this.currentUser) {
      console.error('Kann Thread nicht starten/öffnen: Fehlende Daten', {
        message,
        channel: this.channel,
        currentUser: this.currentUser,
      });
      return;
    }

    if (message.threadKey) {
      console.log(
        `[ChannelChat] Öffne existierenden Thread: ${message.threadKey}`
      );
      this.activeThreadKey = message.threadKey;
      this.openThreadView(message.threadKey);
    } else {
      console.log(
        `[ChannelChat] Starte neuen Thread für Nachricht: ${message.key}`
      );
      this.firebaseService
        .createThread(message, this.channel.key, this.currentUser)
        .subscribe({
          next: (newThreadKey) => {
            console.log(
              `[ChannelChat] Neuer Thread erfolgreich erstellt: ${newThreadKey}`
            );
            this.activeThreadKey = newThreadKey;
            message.threadKey = newThreadKey;
            message.threadReplyCount = 0;
            message.threadLastReplyAt = Date.now();
            this.cdRef.markForCheck();

            this.openThreadView(newThreadKey);
          },
          error: (err) => {
            console.error(
              '[ChannelChat] Fehler beim Erstellen des Threads:',
              err
            );
            // Hier ggf. Nutzerfeedback geben
          },
        });
    }
  }

  openThreadView(threadKey: string): void {
    this.activeThreadKey = threadKey;
    this.variableService.openThread(threadKey);
    console.log(`[ChannelChat] Thread Ansicht für ${threadKey} angefordert.`);
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
        data:{
          mode: 'chat'
        },
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
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '@';
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value;
    this.variableService.setNameToFilter(this.lastInputValue);
  }

  preventEdit(event: MouseEvent) {
    event.preventDefault();

    const textInput = document.querySelector(
      '.textForMessageInput'
    ) as HTMLElement;
    if (!textInput) return;

    textInput.focus();

    const range = document.createRange();
    const selection = window.getSelection();

    if (textInput.lastChild) {
      range.setStartAfter(textInput.lastChild);
    } else {
      range.setStart(textInput, textInput.childNodes.length);
    }

    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  removePersonFromTagged(name: string) {
    const index = this.taggedPersonsInChat.findIndex((e) => e.name === name);

    if (index !== -1) {
      this.taggedPersonsInChat.splice(index, 1);
      console.log(`Person ${name} entfernt.`);
    } else {
      console.log(`Person ${name} nicht gefunden.`);
    }
  }

  openAddSmileyToChannelDialog() {
    const targetElement = document.querySelector('.input-container-wrapper');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
        panelClass: '',
        backdropClass: 'transparentBackdrop',
        position: {
          bottom: `${rect.top - 20 + window.scrollY}px`,
          left: `${rect.left + 20 + window.scrollX}px`,
        },
        data: { channelKey: this.channel?.key },
      });

      // Listen for the emojiSelected event
      const componentInstance =
        dialogRef.componentInstance as SmileyKeyboardComponent;
      componentInstance.emojiSelected.subscribe((selectedEmoji: string) => {
        this.insertEmojiAtCursor(selectedEmoji); // Insert the emoji at the cursor position
      });

      // Optionally, handle dialog close if needed
      dialogRef.afterClosed().subscribe(() => {
        console.log('Smiley keyboard dialog closed');
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();

          const newTop = rect.top - dialogRect.height + window.scrollY;
          const newLeft = rect.right - dialogRect.width + window.scrollX;

          dialogElement.style.position = 'absolute';

          dialogElement.style.height = 'fit-content';
          dialogElement.style.width = 'fit-content';
        }
      }, 0);
    }
  }

  insertEmojiAtCursor(emoji: string) {
    const input = document.querySelector('.textForMessageInput') as HTMLElement;

    if (!input) {
      console.error('Input field not found!');
      return;
    }

    if (!this.savedRange) {
      console.error('No saved cursor position available.');
      input.focus(); // Focus the input field if no range is saved
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;

    try {
      // Restore the saved range
      selection.removeAllRanges();
      selection.addRange(this.savedRange);

      const range = selection.getRangeAt(0);
      range.deleteContents(); // Delete content at the cursor position

      // Insert the emoji as a text node
      const emojiNode = document.createTextNode(emoji);
      range.insertNode(emojiNode);

      // Move the cursor after the inserted emoji
      range.setStartAfter(emojiNode);
      range.collapse(true); // Collapse the range to the end of the emoji

      // Save the updated range
      this.savedRange = range.cloneRange();

      // Focus the input field for further typing
      input.focus();
    } catch (error) {
      console.error('Error inserting emoji:', error);
    }
  }

  saveCursorPosition() {
    const input = document.querySelector('.textForMessageInput') as HTMLElement;

    if (!input) {
      console.error('Input field not found!');
      return;
    }

    input.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();

      if (range.collapsed) {
        console.log('Cursor position is collapsed, saving current position...');
      } else {
        console.log('Text range saved:', range);
      }

      this.savedRange = range;

      const lastChild = input.lastChild;
      if (lastChild) {
        this.savedRange.setStart(lastChild, (lastChild as Text).length);
        this.savedRange.setEnd(lastChild, (lastChild as Text).length);
      }

      console.log(
        'Cursor position saved at end of input field or current position:',
        this.savedRange.endOffset
      );
    } else {
      console.warn('No selection range available to save.');
    }

    // Öffne den Emoji-Dialog (z. B. zum Hinzufügen eines Smileys)
    this.openAddSmileyToChannelDialog();
  }
}
