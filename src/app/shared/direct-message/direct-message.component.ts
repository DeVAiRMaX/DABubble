import {
  Component,
  Input,
  inject,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit, // Geändert von AfterViewChecked für zuverlässigere Initialisierung
  ElementRef,
  ChangeDetectorRef,
  CUSTOM_ELEMENTS_SCHEMA,
  QueryList,
  ViewChildren,
  TrackByFunction,
} from '@angular/core';
import { SharedModule } from '../../shared';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, fromEvent } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { SubService } from '../services/sub.service';
import { VariablesService } from '../../variables.service';
import { User } from '../interfaces/user';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaggingPersonsDialogComponent } from '../channel-chat/tagging-persons-dialog/tagging-persons-dialog.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChannelWithKey } from '../interfaces/channel';

@Component({
  selector: 'app-direct-message',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    SharedModule,
    MatTooltipModule,
  ],
  templateUrl: './direct-message.component.html',
  styleUrls: ['./direct-message.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DirectMessageComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  @Input() otherUser: User | null = null;

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private subService: SubService = inject(SubService);
  private variableService: VariablesService = inject(VariablesService);
  private dialog: MatDialog = inject(MatDialog);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  currentUser: User | null = null;
  conversationId: string | null = null;
  dmMessages$: Observable<Message[]> = of([]);
  isLoading: boolean = false;
  lastInputValue: string = '';
  at = '@';

  editingMessageKey: string | null = null;
  editMessageText: string = '';

  @ViewChild('dmBody') dmBody!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  @ViewChildren('editInput') editInputs!: QueryList<
    ElementRef<HTMLTextAreaElement>
  >;

  private savedRange: Range | null = null;
  private shouldFocusInput: boolean = false;

  private readonly SUB_GROUP_NAME = 'directMessageSubs';
  private readonly SUB_AUTH_DM = this.SUB_GROUP_NAME + '_AuthUser';
  private readonly SUB_MESSAGES_DM = this.SUB_GROUP_NAME + '_MessagesStream';
  private readonly SUB_INPUT_EVENTS = this.SUB_GROUP_NAME + '_InputEvents';

  isShowingAllReactions = new Map<string, boolean>();

  constructor() {}

  ngOnInit(): void {
    const authSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      if (this.otherUser) {
        this.initializeConversation();
      }
    });
    this.subService.add(authSub, this.SUB_AUTH_DM);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['otherUser']) {
      this.shouldFocusInput = true;
      this.cancelEdit();
      if (changes['otherUser'].currentValue) {
        this.initializeConversation();
      } else {
        this.resetState();
      }
    }
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
  }

  ngAfterViewInit() {
    if (this.shouldFocusInput && this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
      this.shouldFocusInput = false;
    }

    if (this.dmBody && this.dmBody.nativeElement) {
      this.subService.add(
        fromEvent<Event>(this.dmBody.nativeElement, 'click').subscribe(
          (event: Event) => {
            this.handleMessageTagClick(event);
          }
        ),
        this.SUB_GROUP_NAME
      );
    }

    if (this.messageInput && this.messageInput.nativeElement) {
      const inputEl = this.messageInput.nativeElement;
      this.subService.add(
        fromEvent(inputEl, 'mouseup').subscribe(() =>
          this.saveCursorPosition()
        ),
        this.SUB_INPUT_EVENTS
      );
      this.subService.add(
        fromEvent<KeyboardEvent>(inputEl, 'keyup').subscribe((event) => {
          if (
            event.key.startsWith('Arrow') ||
            event.key === 'Home' ||
            event.key === 'End'
          ) {
            this.saveCursorPosition();
          }
        }),
        this.SUB_INPUT_EVENTS
      );
    }
  }

  scrollToBottom(): void {
    try {
      if (this.dmBody?.nativeElement) {
        this.dmBody.nativeElement.scrollTop =
          this.dmBody.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  onNewMessageReceived() {
    setTimeout(() => this.scrollToBottom(), 50);
  }

  private initializeConversation(): void {
    if (this.currentUser && this.otherUser) {
      this.isLoading = true;
      const newConversationId = this.generateConversationId(
        this.currentUser.uid,
        this.otherUser.uid
      );
      this.conversationId = newConversationId;
      this.loadMessages(this.conversationId);

      if (this.messageInput?.nativeElement)
        this.messageInput.nativeElement.innerHTML = '';
      this.cdRef.markForCheck();
    } else {
      this.resetState();
    }
  }

  private resetState(): void {
    this.conversationId = null;
    this.dmMessages$ = of([]);
    this.isLoading = false;
    this.cancelEdit();
    this.subService.unsubscribeGroup(this.SUB_MESSAGES_DM);
    this.cdRef.markForCheck();
  }

  private generateConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  private loadMessages(conversationId: string | null): void {
    this.subService.unsubscribeGroup(this.SUB_MESSAGES_DM);

    if (!conversationId) {
      this.dmMessages$ = of([]);
      this.isLoading = false;
      this.cdRef.markForCheck();
      return;
    }

    this.isLoading = true;
    this.dmMessages$ = this.firebaseService
      .getDirectMessages(conversationId)
      .pipe(
        tap(() => {
          this.isLoading = false;
          this.onNewMessageReceived();
          this.cdRef.markForCheck();
        }),
        catchError((error) => {
          console.error(
            '[DirectMessage] Fehler beim Laden der DM-Nachrichten:',
            error
          );
          this.isLoading = false;
          this.dmMessages$ = of([]);
          this.cdRef.markForCheck();
          return of([]);
        })
      );

    const messagesSub = this.dmMessages$.subscribe(() => {
      this.onNewMessageReceived();
    });
    this.subService.add(messagesSub, this.SUB_MESSAGES_DM);
  }

  sendDirectMessage(): void {
    const messageHtml = this.messageInput?.nativeElement.innerHTML.trim();
    const messageText = this.messageInput?.nativeElement.innerText.trim();

    if (
      !messageHtml ||
      !messageText ||
      !this.conversationId ||
      !this.currentUser
    ) {
      return;
    }
    this.firebaseService
      .sendDirectMessage(this.conversationId, messageHtml, this.currentUser)
      .subscribe({
        next: () => {
          if (this.messageInput?.nativeElement) {
            this.messageInput.nativeElement.innerHTML = '';
          }
        },
        error: (err) => {
          console.error(
            '[DirectMessage] Fehler beim Senden der Nachricht:',
            err
          );
        },
      });
  }

  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) return this.sanitizer.bypassSecurityTrustHtml('');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  isOwnMessage(message: Message): boolean {
    return !!this.currentUser && message.senderUid === this.currentUser.uid;
  }

  shouldShowDateDivider(
    currentMessage: Message,
    previousMessage: Message | null | undefined
  ): boolean {
    if (!previousMessage) return true;
    if (!currentMessage?.time || !previousMessage?.time) return false;
    try {
      const currentDate = new Date(currentMessage.time);
      const previousDate = new Date(previousMessage.time);
      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (e) {
      return false;
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDirectMessage();
    }
  }

  onInputForTagging(event: Event) {
    this.saveCursorPosition();
    this.checkForMention(event);
  }

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLDivElement;
    if (!this.savedRange) {
      this.saveCursorPosition();
      if (!this.savedRange) return;
    }

    const range = this.savedRange;
    let charBeforeCursor = '';
    let currentWordBeforeCursor = '';

    if (
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset > 0
    ) {
      const textContent = range.startContainer.textContent!;
      const textBefore = textContent.substring(0, range.startOffset);
      const wordMatch = textBefore.match(/([@#])([\w\-äöüÄÖÜß]*)$/u);
      if (wordMatch) {
        currentWordBeforeCursor = wordMatch[0];
        charBeforeCursor = wordMatch[1];
      }
    }

    const fullInputText = inputElement.innerText;

    if (charBeforeCursor === '@' || charBeforeCursor === '#') {
      if (this.isInsideTagSpan(range.startContainer)) {
        this.lastInputValue = fullInputText;
        return;
      }
      this.openTagPeopleOrChannelDialog(
        charBeforeCursor,
        currentWordBeforeCursor || charBeforeCursor
      );
    } else {
      const openTagDialog = this.dialog.openDialogs.find(
        (d: MatDialogRef<any>) =>
          d.componentInstance instanceof TaggingPersonsDialogComponent
      );
      if (openTagDialog) {
        const dialogInstance =
          openTagDialog.componentInstance as TaggingPersonsDialogComponent;
        let relevantPartOfInput = '';
        const lastTriggerIndex = fullInputText.lastIndexOf(
          dialogInstance.triggerChar
        );
        if (lastTriggerIndex !== -1) {
          relevantPartOfInput = fullInputText.substring(lastTriggerIndex);
        }
        if (relevantPartOfInput.startsWith(dialogInstance.triggerChar)) {
          this.variableService.setNameToFilter(relevantPartOfInput);
        } else {
          openTagDialog.close();
        }
      }
    }
    this.lastInputValue = fullInputText;
  }

  isInsideTagSpan(node: Node | null): boolean {
    let currentNode = node;
    while (currentNode && currentNode !== this.messageInput.nativeElement) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as HTMLElement;
        if (
          element.classList.contains('user-tag') ||
          element.classList.contains('channel-tag') ||
          (element.hasAttribute('contenteditable') &&
            element.getAttribute('contenteditable') === 'false')
        ) {
          return true;
        }
      }
      currentNode = currentNode.parentNode;
    }
    return false;
  }

  openTaggingPerClick(char: '@' | '#', event: Event) {
    event.preventDefault();
    const inputEl = this.messageInput.nativeElement;
    inputEl.focus();

    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    if (
      this.savedRange &&
      inputEl.contains(this.savedRange.commonAncestorContainer)
    ) {
      range = this.savedRange.cloneRange();
    } else {
      range = document.createRange();
      range.selectNodeContents(inputEl);
      range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);

    if (!range.collapsed) {
      range.deleteContents();
    }

    const triggerNode = document.createTextNode(char);
    range.insertNode(triggerNode);

    range.setStartAfter(triggerNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.savedRange = range.cloneRange();

    this.openTagPeopleOrChannelDialog(char, char);
    this.lastInputValue = inputEl.innerText;
  }

  openTagPeopleOrChannelDialog(char: '@' | '#', filterPrefix: string) {
    const targetElement = this.messageInput.nativeElement;
    const rect = targetElement.getBoundingClientRect();
    this.variableService.setNameToFilter(filterPrefix);

    const dialogRef = this.dialog.open(TaggingPersonsDialogComponent, {
      position: {
        bottom: `${window.innerHeight - rect.top + 5}px`,
        left: `${rect.left}px`,
      },
      panelClass: ['tagging-dialog'],
      backdropClass: 'transparentBackdrop',
      hasBackdrop: true,
      disableClose: false,
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: char === '@' ? 'user' : 'channel',
        char: char,
        initialFilter: filterPrefix,
      },
    });

    dialogRef.componentInstance.contactSelected.subscribe(
      (selectedItem: {
        id: string;
        name: string;
        type: 'user' | 'channel';
      }) => {
        this.insertTagIntoInput(
          selectedItem.name,
          selectedItem.id,
          selectedItem.type
        );
        this.messageInput.nativeElement.focus();
      }
    );

    dialogRef.afterClosed().subscribe(() => {});
  }

  insertTagIntoInput(name: string, id: string, type: 'user' | 'channel'): void {
    const inputEl = this.messageInput.nativeElement;
    inputEl.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let range: Range;
    if (
      this.savedRange &&
      inputEl.contains(this.savedRange.commonAncestorContainer)
    ) {
      range = this.savedRange.cloneRange();
    } else {
      range = selection.getRangeAt(0).cloneRange();
    }

    selection.removeAllRanges();
    selection.addRange(range);

    const activeFilterPrefix = this.variableService.getNameToFilter();
    if (
      range.startContainer.nodeType === Node.TEXT_NODE &&
      (activeFilterPrefix.startsWith('@') || activeFilterPrefix.startsWith('#'))
    ) {
      const textNode = range.startContainer as Text;
      if (
        textNode.textContent
          ?.substring(0, range.startOffset)
          .endsWith(activeFilterPrefix)
      ) {
        range.setStart(textNode, range.startOffset - activeFilterPrefix.length);
        range.deleteContents();
      }
    }

    const tagSpan = document.createElement('span');
    tagSpan.classList.add(type === 'user' ? 'user-tag' : 'channel-tag');
    tagSpan.setAttribute(`data-${type}-id`, id);
    tagSpan.setAttribute('contenteditable', 'false');
    tagSpan.innerText = (type === 'user' ? '@' : '#') + name;

    const spaceNode = document.createTextNode('\u00A0');

    range.insertNode(tagSpan);
    range.setStartAfter(tagSpan);
    range.collapse(true);
    range.insertNode(spaceNode);
    range.setStartAfter(spaceNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
    this.savedRange = range.cloneRange();
    this.lastInputValue = inputEl.innerText;
    this.variableService.setNameToFilter('');
  }

  handleMessageTagClick(event: Event): void {
    const targetElement = event.target as HTMLElement;
    const messageContainer = targetElement.closest('.dm-message-container');

    if (targetElement.classList.contains('user-tag') && messageContainer) {
      event.preventDefault();
      const userId = targetElement.getAttribute('data-user-id');
      if (userId && this.currentUser?.uid) {
        this.firebaseService.getUserData(userId).subscribe((dmUserData) => {
          if (dmUserData) {
            const targetUser: User = {
              uid: dmUserData.uid,
              displayName: dmUserData.displayName,
              email: dmUserData.email,
              avatar: (dmUserData as any).avatar,
              channelKeys: dmUserData.channelKeys || [],
            };
            this.variableService.setActiveDmUser(targetUser); // Bleibt im DM-Modus, wechselt aber den User
          }
        });
      }
    } else if (
      targetElement.classList.contains('channel-tag') &&
      messageContainer
    ) {
      event.preventDefault();
      const channelId = targetElement.getAttribute('data-channel-id');
      if (channelId) {
        this.firebaseService.getChannel(channelId).subscribe((channelData) => {
          if (channelData) {
            const channelWithKey: ChannelWithKey = {
              ...channelData,
              key: channelId,
            };
            this.variableService.setActiveChannel(channelWithKey); // Wechselt zum Channel
          }
        });
      }
    }
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
      if (this.currentUser && reaction.userId === this.currentUser.uid) {
        acc[reaction.emoji].reactedByUser = true;
      }
      return acc;
    }, initialAcc);
    return Object.values(grouped);
  }

  getTotalGroupedReactionsCount(message: Message | null): number {
    if (!message) return 0;
    return this.groupReactions(message.reactions).length;
  }

  getReactionLimit(): number {
    return 7;
  }

  getDisplayedReactions(message: Message | null): GroupedReaction[] {
    if (!message) return [];
    const allGrouped = this.groupReactions(message.reactions);
    const limit = this.getReactionLimit();

    if (this.isShowingAll(message)) {
      return allGrouped;
    } else {
      return allGrouped.slice(0, limit);
    }
  }

  isShowingAll(message: Message | null): boolean {
    if (!message || !message.key) {
      return false;
    }
    return this.isShowingAllReactions.get(message.key) || false;
  }

  toggleShowAllReactions(message: Message | null): void {
    if (!message || !message.key) return;
    const currentState = this.isShowingAll(message);
    this.isShowingAllReactions.set(message.key, !currentState);
    this.cdRef.markForCheck();
  }

  toggleReaction(message: Message | null, emoji: string): void {
    if (!message || !message.key || !this.conversationId || !this.currentUser) {
      return;
    }
    this.firebaseService
      .toggleDirectMessageReaction(
        this.conversationId,
        message.key,
        emoji,
        this.currentUser
      )
      .subscribe({
        error: (err) => console.error('Fehler bei DM-Reaktion:', err),
      });
  }

  openEmojiPickerForReaction(message: Message | null): void {
    if (!message || !message.key || !this.conversationId || !this.currentUser)
      return;
    (document.activeElement as HTMLElement)?.blur();
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

  trackByMessageKey: TrackByFunction<Message> = (
    index: number,
    message: Message
  ): string => {
    const reactionsKey = message.reactions
      ?.map((r) => r.userId + r.emoji)
      .join('_');
    return `${message.key}-${this.editingMessageKey === message.key}-${
      message.editedAt
    }-${reactionsKey || ''}`;
  };

  startEditing(message: Message): void {
    if (!message?.key) {
      return;
    }
    this.editingMessageKey = message.key;
    this.editMessageText = message.message;
    this.cdRef.detectChanges();

    setTimeout(() => {
      const editInputForMessage = this.editInputs.find((inputEl) => {
        const parentContainer = inputEl.nativeElement.closest(
          '.dm-message-container'
        );
        return (
          parentContainer?.getAttribute('data-message-key') ===
          this.editingMessageKey
        );
      });

      if (editInputForMessage?.nativeElement) {
        editInputForMessage.nativeElement.focus();
        const length = editInputForMessage.nativeElement.value.length;
        editInputForMessage.nativeElement.setSelectionRange(length, length);
      }
    }, 0);
  }

  saveEdit(message: Message): void {
    const newText = this.editMessageText.trim();
    if (
      !this.editingMessageKey ||
      !this.conversationId ||
      !newText ||
      newText === message.message
    ) {
      this.cancelEdit();
      return;
    }

    this.firebaseService
      .updateDirectMessage(this.conversationId, this.editingMessageKey, newText)
      .subscribe({
        next: () => this.cancelEdit(),
        error: (err) => this.cancelEdit(),
      });
  }

  cancelEdit(): void {
    this.editingMessageKey = null;
    this.editMessageText = '';
    this.cdRef.markForCheck();
  }

  handleEditEnter(event: KeyboardEvent, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEdit(message);
    }
  }

  openEmojiPicker(): void {
    const targetElement = this.messageInput.nativeElement;
    this.saveCursorPosition();
    if (targetElement) {
      (document.activeElement as HTMLElement)?.blur();
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
        panelClass: 'emoji-picker-dialog',
        backdropClass: 'transparentBackdrop',
        position: {
          bottom: `${window.innerHeight - rect.top + 10}px`,
          left: `${rect.left}px`,
        },
      });

      dialogRef.componentInstance.emojiSelected.subscribe((emoji: string) => {
        dialogRef.close();
        setTimeout(() => this.insertEmojiAtCursor(emoji), 10);
      });
    }
  }

  saveCursorPosition(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      if (this.messageInput?.nativeElement.contains(selection.anchorNode)) {
        this.savedRange = selection.getRangeAt(0).cloneRange();
      } else {
        this.savedRange = null;
      }
    } else {
      this.savedRange = null;
    }
  }

  insertEmojiAtCursor(emoji: string): void {
    if (!this.messageInput || !this.messageInput.nativeElement) return;
    const inputElement = this.messageInput.nativeElement;
    inputElement.focus();

    const selection = window.getSelection();
    if (!selection) return;

    if (
      this.savedRange &&
      inputElement.contains(this.savedRange.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(inputElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (!document.execCommand('insertText', false, emoji)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(emoji);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.saveCursorPosition();
  }
}
