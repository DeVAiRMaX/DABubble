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
  QueryList,
  ViewChildren,
  AfterViewInit,
  TrackByFunction,
  HostListener,
} from '@angular/core';
import { VariablesService } from '../../variables.service';

import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChannelMembersOverlayComponent } from './channel-members-overlay/channel-members-overlay.component';
import { ChannelWithKey } from '../interfaces/channel';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';
import { SubService } from '../services/sub.service';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { User } from '../interfaces/user';
import { SmileyKeyboardComponent } from './smiley-keyboard/smiley-keyboard.component';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    SharedModule,
    SharedModule,
    FormsModule,
    MatTooltipModule,
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
  editingMessageKey: string | null = null;
  editMessageText: string = '';

  @ViewChild('channelChatBody') channelChatBody!: ElementRef;
  @Input() channel!: ChannelWithKey;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  @ViewChildren('editInput') editInputs!: QueryList<
    ElementRef<HTMLTextAreaElement>
  >;

  private variableService: VariablesService = inject(VariablesService);
  private subService: SubService = inject(SubService);
  private dialog: MatDialog = inject(MatDialog);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private savedRange: Range | null = null;
  private readonly SUB_GROUP_NAME = 'channelChatSubs';
  private readonly SUB_MESSAGES = 'channelMessages';

  isShowingAllReactions = new Map<string, boolean>();
  isMobileView: boolean = window.innerWidth < 800;

  taggedPersonsInChat = this.variableService.getTaggedContactsFromChat();
  taggedPerson: any;

  messages$: Observable<Message[]> = of([]);
  currentUser: User | null = null;
  channelMember: User | null = null;
  memberAvatars: string[] = [];

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.isMobileView = window.innerWidth < 768;
    this.cdRef.markForCheck();
  }

  @ViewChild('messageInput') messageInputRef!: ElementRef;

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
    this.onResize();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
    setTimeout(() => {
      this.messageInputRef?.nativeElement?.focus();
    }, 0);
  }

  scrollToBottom(): void {
    try {
      this.channelChatBody.nativeElement.scrollTop =
        this.channelChatBody.nativeElement.scrollHeight;
    } catch (err) {
      console.warn('Scroll failed', err);
    }
  }

  getReactionLimit(): number {
    const mobileLimit = 7;
    const desktopLimit = 20;
    return this.isMobileView ? mobileLimit : desktopLimit;
  }

  trackByMessageKey: TrackByFunction<Message> = (
    index: number,
    message: Message
  ): string => {
    return `<span class="math-inline">\{message\.key\}\-</span>{this.editingMessageKey === message.key}-${
      message.reactions?.length || 0
    }`;
  };

  onNewMessageReceived() {
    this.scrollToBottom();
  }

  getChannelMembers() {
    this.firebaseService
      .getChannel(this.channel.key)
      .subscribe(async (user) => {
        if (user?.members && Array.isArray(user.members)) {
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
          this.channel.members = [];
          this.memberAvatars = [];
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['channel'] &&
      changes['channel'].currentValue?.key !==
        changes['channel'].previousValue?.key
    ) {
      this.cancelEdit();
      this.getChannelMembers();
    } else if (changes['channel']) {
      this.getChannelMembers();
    }

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
          this.onNewMessageReceived();
        },
        error: (err) => {
          console.error('[sendMessage] Fehler beim Senden:', err);
        },
      });
  }

  shouldShowDateDivider(
    currentMessage: Message,
    previousMessage: Message | null | undefined
  ): boolean {
    if (!previousMessage) {
      return true;
    }
    if (!currentMessage?.time || !previousMessage?.time) {
      console.warn('Fehlender Zeitstempel für Datums-Divider-Prüfung.');
      return false;
    }

    try {
      const currentDate = new Date(currentMessage.time);
      const previousDate = new Date(previousMessage.time);

      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        console.warn('Ungültiges Datum bei Datums-Divider-Prüfung.');
        return false;
      }

      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (error) {
      console.error('Fehler beim Vergleichen der Daten für Divider:', error);
      return false;
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
      this.activeThreadKey = message.threadKey;
      this.openThreadView(message.threadKey);
    } else {
      this.firebaseService
        .createThread(message, this.channel.key, this.currentUser)
        .subscribe({
          next: (newThreadKey) => {
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
          },
        });
    }
  }

  openThreadView(threadKey: string): void {
    this.activeThreadKey = threadKey;
    this.variableService.openThread(threadKey);
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
        data: {
          mode: 'chat',
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
    } else {
      // nicht gefunden
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

      const componentInstance =
        dialogRef.componentInstance as SmileyKeyboardComponent;
      componentInstance.emojiSelected.subscribe((selectedEmoji: string) => {
        this.insertEmojiAtCursor(selectedEmoji);
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
      input.focus();
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;

    try {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const emojiNode = document.createTextNode(emoji);
      range.insertNode(emojiNode);

      range.setStartAfter(emojiNode);
      range.collapse(true);

      this.savedRange = range.cloneRange();

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

      this.savedRange = range;

      const lastChild = input.lastChild;
      if (lastChild) {
        this.savedRange.setStart(lastChild, (lastChild as Text).length);
        this.savedRange.setEnd(lastChild, (lastChild as Text).length);
      }
    } else {
      console.warn('No selection range available to save.');
    }

    this.openAddSmileyToChannelDialog();
  }

  toggleReaction(message: Message, emoji: string): void {
    if (!this.currentUser || !message.key || !this.channel?.key) return;

    this.firebaseService
      .toggleReaction(this.channel.key, message.key, emoji, this.currentUser)
      .subscribe({
        error: (err) => console.error('Fehler beim togglen der Reaktion:', err),
      });
  }

  openEmojiPickerForReaction(message: Message): void {
    if (!this.currentUser || !message.key || !this.channel?.key) return;

    const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
      panelClass: 'emoji-picker-dialog-reaction',
      backdropClass: 'transparentBackdrop',
    });

    dialogRef.componentInstance.emojiSelected.subscribe(
      (selectedEmoji: string) => {
        this.toggleReaction(message, selectedEmoji);
      }
    );
  }

  groupReactions(reactions: Reaction[] | undefined): GroupedReaction[] {
    if (!reactions || reactions.length === 0) {
      return [];
    }

    const initialAcc: Record<string, GroupedReaction> = {};

    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userIds: [],
          userNames: [],
          reactedByUser: false,
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].userIds.push(reaction.userId);
      if (reaction.userName) {
        acc[reaction.emoji].userNames.push(reaction.userName);
      }
      if (reaction.userId === this.currentUser?.uid) {
        acc[reaction.emoji].reactedByUser = true;
      }
      return acc;
    }, initialAcc);

    return Object.values(grouped);
  }

  getTotalGroupedReactionsCount(message: Message): number {
    // Cache das Ergebnis von groupReactions, wenn es oft aufgerufen wird
    // Einfache Variante:
    return this.groupReactions(message.reactions).length;
  }

  getDisplayedReactions(message: Message): GroupedReaction[] {
    const allGrouped = this.groupReactions(message.reactions);
    const totalCount = allGrouped.length;
    const limit = this.getReactionLimit();

    if (this.isShowingAll(message)) {
      return allGrouped;
    } else {
      return allGrouped.slice(0, limit);
    }
  }

  isShowingAll(message: Message): boolean {
    if (!message || !message.key) {
      return false;
    }
    return this.isShowingAllReactions.get(message.key) || false;
  }

  toggleShowAllReactions(message: Message): void {
    if (!message || !message.key) {
      console.warn(
        'Versuch, den Reaktionsstatus für eine Nachricht ohne Key umzuschalten.'
      );
      return;
    }

    const currentState = this.isShowingAll(message);
    this.isShowingAllReactions.set(message.key, !currentState);
    this.cdRef.markForCheck();
  }

  startEditing(message: Message): void {
    if (!message?.key) {
      return;
    }

    this.editingMessageKey = message.key;
    this.editMessageText = message.message;

    this.cdRef.markForCheck();
    setTimeout(() => {
      const inputEl = this.editInputs.find(
        (el) =>
          !!el.nativeElement
            .closest('.channel-chat-message-container')
            ?.classList.contains('editing')
      );

      if (inputEl?.nativeElement) {
        inputEl.nativeElement.focus();
        const length = inputEl.nativeElement.value.length;
        inputEl.nativeElement.setSelectionRange(length, length);
      } else {
        console.warn(
          'Konnte das zu fokussierende Edit-Input-Element nicht finden.'
        );
      }
    }, 0);
  }

  saveEdit(message: Message): void {
    const newText = this.editMessageText.trim();
    if (
      !this.editingMessageKey ||
      !newText ||
      newText === message.message ||
      !this.channel?.key
    ) {
      this.cancelEdit();
      return;
    }

    this.firebaseService
      .updateMessage(this.channel.key, this.editingMessageKey, newText)
      .subscribe({
        next: () => {
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Fehler beim Speichern der Bearbeitung:', err);
        },
      });
  }

  handleEditEnter(event: any, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEdit(message);
    }
  }

  cancelEdit(): void {
    this.editingMessageKey = null;
    this.editMessageText = '';
  }
}
