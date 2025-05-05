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
} from '@angular/core';
import { SharedModule } from '../../shared';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
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

  @ViewChild('dmBody') dmBody!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  private savedRange: Range | null = null;

  private readonly SUB_GROUP_NAME = 'directMessageSubs';
  private readonly SUB_AUTH = 'dmAuth';
  private readonly SUB_MESSAGES = 'dmMessages';

  isShowingAllReactions = new Map<string, boolean>();

  constructor() {}

  ngOnInit(): void {
    const authSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      this.initializeConversation();
    });
    this.subService.add(authSub, this.SUB_AUTH);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['otherUser'] && changes['otherUser'].currentValue) {
      this.initializeConversation();
    } else if (changes['otherUser'] && !changes['otherUser'].currentValue) {
      this.resetState();
    }
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
    this.subService.unsubscribeGroup(this.SUB_AUTH);
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);
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
    } catch (err) {
      console.warn('[DirectMessage] Scroll failed', err);
    }
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
      if (newConversationId !== this.conversationId) {
        this.conversationId = newConversationId;
        this.loadMessages(this.conversationId);
      } else {
        this.isLoading = false;
      }
      this.messageText = '';
      if (this.messageInput) this.messageInput.nativeElement.innerText = '';
      this.cdRef.markForCheck();
    } else {
      this.resetState();
    }
  }

  private resetState(): void {
    this.conversationId = null;
    this.dmMessages$ = of([]);
    this.isLoading = false;
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);
    this.cdRef.markForCheck();
  }

  private generateConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  private loadMessages(conversationId: string | null): void {
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);

    if (!conversationId) {
      this.dmMessages$ = of([]);
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.dmMessages$ = this.firebaseService
      .getDirectMessages(conversationId)
      .pipe(
        tap(() => setTimeout(() => this.scrollToBottom(), 50)),
        tap(() => (this.isLoading = false)),
        catchError((error) => {
          console.error(
            '[DirectMessage] Fehler beim Laden der DM-Nachrichten:',
            error
          );
          this.isLoading = false;
          return of([]);
        })
      );

    const messagesSub = this.dmMessages$.subscribe();
    this.subService.add(messagesSub, this.SUB_MESSAGES);
  }

  sendDirectMessage(): void {
    const text =
      this.messageInput?.nativeElement.innerText.trim() ||
      this.messageText.trim();

    if (!text || !this.conversationId || !this.currentUser) {
      console.warn('[DirectMessage] Senden nicht möglich: Fehlende Daten', {
        text,
        id: this.conversationId,
        user: this.currentUser,
      });
      return;
    }
    this.firebaseService
      .sendDirectMessage(this.conversationId, text, this.currentUser)
      .subscribe({
        next: () => {
          this.messageText = '';
          this.onNewMessageReceived();
        },
        error: (err) => {
          console.error(
            '[DirectMessage] Fehler beim Senden der Nachricht:',
            err
          );
        },
      });
  }

  // --- Hilfsmethoden für das Template ---

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
      console.error('Error comparing dates', e);
      return false;
    }
  }

  // Platzhalter für reactions (johannes bittiii <3)
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

  getTotalGroupedReactionsCount(message: Message | null): number {
    if (!message) return 0;
    return this.groupReactions(message.reactions).length;
  }

  // getReactionLimit - Gibt *immer* 7 zurück (wie im Thread)
  getReactionLimit(): number {
    return 7; // Festes Limit für DMs
  }

  // getDisplayedReactions - angepasst für Message und festes Limit
  getDisplayedReactions(message: Message | null): GroupedReaction[] {
    if (!message) return [];
    const allGrouped = this.groupReactions(message.reactions);
    const totalCount = allGrouped.length;
    const limit = this.getReactionLimit();

    if (this.isShowingAll(message)) {
      return allGrouped;
    } else {
      return allGrouped.slice(0, limit);
    }
  }

  // isShowingAll - angepasst für Message
  isShowingAll(message: Message | null): boolean {
    if (!message || !message.key) {
      // Nachrichten in DMs haben auch einen Key
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
      console.warn('toggleReaction (DM): Fehlende Daten', {
        message,
        emoji,
        conversationId: this.conversationId,
        user: this.currentUser,
      });
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

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.messageText = this.messageInput?.nativeElement.innerText || '';
      this.sendDirectMessage();
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.innerText = '';
        this.messageText = '';
      }
    }
  }

  onInput(event: Event): void {
    this.messageText = (event.target as HTMLDivElement).innerText;
    this.lastInputValue = this.messageText;
  }

  openEmojiPicker(): void {
    const targetElement = document.querySelector('.textForMessageInput');
    this.saveCursorPosition();
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
        panelClass: 'emoji-picker-dialog',
        backdropClass: 'transparentBackdrop',
        position: {
          bottom: `${rect.top - 20 + window.scrollY}px`,
          left: `${rect.left + 20 + window.scrollX}px`,
        },
      });

      dialogRef.componentInstance.emojiSelected.subscribe((emoji: string) => {
        this.insertEmojiAtCursor(emoji);
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          dialogElement.style.position = 'absolute';
          const newTop = rect.top - dialogRect.height + window.scrollY;
          const newLeft = rect.left - window.scrollX;
          dialogElement.style.width = `unset`;
          dialogElement.style.height = `unset`;
          dialogElement.style.top = `${newTop}px`;
          dialogElement.style.left = `${newLeft}px`;
        }
      }, 0);
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
      const range =
        selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : document.createRange();
      if (!inputElement.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(inputElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
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
