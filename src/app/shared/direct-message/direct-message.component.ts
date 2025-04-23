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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { SubService } from '../services/sub.service';
import { VariablesService } from '../../variables.service';
import { User } from '../interfaces/user';
import { Message } from '../interfaces/message';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';

@Component({
  selector: 'app-direct-message',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
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

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  private savedRange: Range | null = null;

  private readonly SUB_GROUP_NAME = 'directMessageSubs';
  private readonly SUB_AUTH = 'dmAuth';
  private readonly SUB_MESSAGES = 'dmMessages';

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
      console.log('[DirectMessage] Other user changed:', this.otherUser);
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

  private initializeConversation(): void {
    if (this.currentUser && this.otherUser) {
      this.isLoading = true;
      this.conversationId = this.generateConversationId(
        this.currentUser.uid,
        this.otherUser.uid
      );
      console.log(
        '[DirectMessage] Initializing conversation with ID:',
        this.conversationId
      );
      this.loadMessages(this.conversationId);
      this.messageText = '';
      this.cdRef.markForCheck();
    } else {
      console.log(
        '[DirectMessage] Cannot initialize, currentUser or otherUser missing.'
      );
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
    const sortedUIDs = [uid1, uid2].sort();
    return sortedUIDs.join('_');
  }

  private loadMessages(conversationId: string | null): void {
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);

    if (!conversationId) {
      this.dmMessages$ = of([]);
      this.isLoading = false;
      return;
    }

    // Annahme: FirebaseService hat eine Methode getDirectMessages
    this.dmMessages$ = this.firebaseService
      .getDirectMessages(conversationId)
      .pipe(
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
  }

  sendDirectMessage(): void {
    const text = this.messageText.trim();

    if (!text || !this.conversationId || !this.currentUser) {
      console.warn('[DirectMessage] Senden nicht möglich: Fehlende Daten', {
        text,
        id: this.conversationId,
        user: this.currentUser,
      });
      return;
    }

    console.log(
      `[DirectMessage] Sende Nachricht zu Konversation ${this.conversationId}`
    );

    this.firebaseService
      .sendDirectMessage(this.conversationId, text, this.currentUser)
      .subscribe({
        next: () => {
          console.log('[DirectMessage] Nachricht erfolgreich gesendet.');
          this.messageText = '';
          // this.scrollToBottom();
        },
        error: (err) => {
          console.error(
            '[DirectMessage] Fehler beim Senden der Nachricht:',
            err
          );
          // Ggf. Nutzerfeedback
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
    const currentDate = new Date(currentMessage.time);
    const previousDate = new Date(previousMessage.time);
    return currentDate.toDateString() !== previousDate.toDateString();
  }

  // Platzhalter für reactions (johannes bittiii <3)
  getUniqueReactions(reactions: any[] | undefined): any[] {
    if (!reactions) return [];
    return [];
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.messageText = this.messageInput?.nativeElement.innerText || '';
      this.sendDirectMessage();
      if (this.messageInput) this.messageInput.nativeElement.innerText = '';
    }
  }

  onInput(event: Event): void {
    this.messageText = (event.target as HTMLDivElement).innerText;
    this.lastInputValue = this.messageText;
  }

  //nochmal schauen wa
  openEmojiPicker(): void {
    const targetElement = document.querySelector('.textForMessageInput');
    this.saveCursorPosition();
    if(targetElement){
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
      panelClass: 'emoji-picker-dialog',
      backdropClass: 'transparentBackdrop',
      position:{
        bottom: `${rect.top - 20 + window.scrollY}px`,
        left: `${rect.left + 20 + window.scrollX}px`,
      }
    });

     dialogRef.componentInstance.emojiSelected.subscribe((emoji: string) => {
      this.insertEmojiAtCursor(emoji);
    });


    setTimeout(() => {
      const dialogElement = document.querySelector('mat-dialog-container') as HTMLElement;
      if(dialogElement){
        const dialogRect = dialogElement.getBoundingClientRect();
        dialogElement.style.position = 'absolute';
        const newTop = rect.top - dialogRect.height + window.scrollY;
        const newLeft = rect.right - dialogRect.width - window.scrollX;
      }
    }, 0);
    }
    

   
  }

  saveCursorPosition(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      if (this.messageInput?.nativeElement.contains(selection.anchorNode)) {
        this.savedRange = selection.getRangeAt(0).cloneRange();
        console.log('Cursor pos saved:', this.savedRange);
      } else {
        this.savedRange = null;
        console.log('Cursor outside input, not saved.');
      }
    } else {
      this.savedRange = null;
      console.log('No selection to save.');
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
