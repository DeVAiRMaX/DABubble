import {
  Component,
  Input,
  inject,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
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
import { Observable, of, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { SubService } from '../services/sub.service';
import { VariablesService } from '../../variables.service';
import { User } from '../interfaces/user';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';
import { MatTooltipModule } from '@angular/material/tooltip';

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
export class DirectMessageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() otherUser: User | null = null;

  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private subService: SubService = inject(SubService);
  private variableService: VariablesService = inject(VariablesService);
  private dialog: MatDialog = inject(MatDialog);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  currentUser: User | null = null;
  conversationId: string | null = null;
  dmMessages$: Observable<Message[]> = of([]);
  messageText: string = '';
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

  private readonly SUB_AUTH_DM = 'directMessageAuthUser';
  private readonly SUB_MESSAGES_DM = 'directMessageMessagesStream';

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
      this.cancelEdit();
      if (changes['otherUser'].currentValue) {
        this.initializeConversation();
      } else {
        this.resetState();
      }
    }
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_AUTH_DM);
    this.subService.unsubscribeGroup(this.SUB_MESSAGES_DM);
  }

  ngAfterViewInit() {
    if (this.dmBody) {
      this.scrollToBottom();
    } else {
      setTimeout(() => this.scrollToBottom(), 0);
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

      this.messageText = '';
      if (this.messageInput?.nativeElement)
        this.messageInput.nativeElement.innerText = '';
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
    const text =
      this.messageInput?.nativeElement.innerText.trim() ||
      this.messageText.trim();

    if (!text || !this.conversationId || !this.currentUser) {
      return;
    }
    this.firebaseService
      .sendDirectMessage(this.conversationId, text, this.currentUser)
      .subscribe({
        next: () => {
          this.messageText = '';
          if (this.messageInput?.nativeElement) {
            this.messageInput.nativeElement.innerText = '';
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
      const currentTime = new Date(currentMessage.time).getTime();
      const previousTime = new Date(previousMessage.time).getTime();
      if (isNaN(currentTime) || isNaN(previousTime)) return false;

      const currentDate = new Date(currentMessage.time);
      const previousDate = new Date(previousMessage.time);
      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (e) {
      return false;
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
      console.warn(
        '[DirectMessage] Bedingungen für Update nicht erfüllt oder Text unverändert. Bearbeitung wird abgebrochen.',
        {
          editingMessageKey: this.editingMessageKey,
          conversationId: this.conversationId,
          newText: newText,
          isSame: newText === message.message,
        }
      );
      this.cancelEdit();
      return;
    }

    this.firebaseService
      .updateDirectMessage(this.conversationId, this.editingMessageKey, newText)
      .subscribe({
        next: () => {
          this.cancelEdit();
        },
        error: (err) => {
          console.error(
            '[DirectMessage] Fehler beim Speichern der Bearbeitung (im subscribe error Block):',
            err
          );
          this.cancelEdit();
        },
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

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDirectMessage();
    }
  }

  onInput(event: Event): void {
    this.messageText = (event.target as HTMLDivElement).innerText;
  }

  openEmojiPicker(): void {
    const targetElement = this.messageInput.nativeElement;
    this.saveCursorPosition();
    if (targetElement) {
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
        this.insertEmojiAtCursor(emoji);
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

    this.messageText = inputElement.innerText;
    this.saveCursorPosition();
  }
}
