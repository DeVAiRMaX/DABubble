import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TaggingPersonsDialogComponent } from '../channel-chat/tagging-persons-dialog/tagging-persons-dialog.component';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { Thread, ThreadMessage } from '../interfaces/thread';
import { User } from '../interfaces/user';
import {
  Observable,
  Subject,
  Subscription,
  catchError,
  from,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import { get, ref } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';
import { ChannelWithKey } from '../interfaces/channel';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { objectVal, DatabaseReference } from '@angular/fire/database';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatTooltipModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '500ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '500ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class ThreadComponent implements OnInit, OnDestroy {
  @Input() channel!: ChannelWithKey;
  @ViewChild('editableDiv') editableDiv!: ElementRef<HTMLDivElement>;

  private variableService: VariablesService = inject(VariablesService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private dialog: MatDialog = inject(MatDialog);
  private savedRange: Range | null = null;
  private destroy$ = new Subject<void>();
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  isOpen: boolean = false;
  currentThreadKey: string | null = null;
  threadMessages$: Observable<ThreadMessage[]> = of([]);
  originalMessage$: Observable<Message | null> = of(null);
  currentUser: User | null = null;
  originalMessageDetails: Message | null = null;
  originalMessageChannelKey: string | null = null;

  private subscriptions = new Subscription();

  threadMessageText: string = '';
  lastInputValue: string = '';
  taggedPersonsInThreads = this.variableService.getTaggedcontactsFromThreads();
  isShowingAllReactions = new Map<string, boolean>();

  constructor() {}

  ngOnInit(): void {
    const openSub = this.variableService.threadIsOpen$.subscribe(
      (open) => (this.isOpen = open)
    );
    const keySub = this.variableService.activeThreadKey$
      .pipe(
        tap((key) => (this.currentThreadKey = key)),
        switchMap((key) => {
          if (key) {
            this.threadMessages$ = this.firebaseService.getThreadMessages(key);
            this.originalMessage$ = this.loadOriginalMessage(key);
            return of(key);
          } else {
            this.threadMessages$ = of([]);
            this.originalMessage$ = of(null);
            return of(null);
          }
        })
      )
      .subscribe();

    const userSub = this.authService.user$.subscribe(
      (user) => (this.currentUser = user)
    );

    this.subscriptions.add(openSub);
    this.subscriptions.add(keySub);
    this.subscriptions.add(userSub);
  }

  ngAfterViewInit() {
    const el = this.editableDiv.nativeElement;

    fromEvent(el, 'keyup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cacheCurrentRange());
    fromEvent(el, 'mouseup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cacheCurrentRange());
  }

  private cacheCurrentRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  loadOriginalMessage(threadKey: string): Observable<Message | null> {
    const threadRef = ref(
      this.firebaseService['database'],
      `Threads/${threadKey}`
    );

    return from(get(threadRef)).pipe(
      switchMap((threadSnapshot) => {
        if (threadSnapshot.exists()) {
          const threadData = threadSnapshot.val() as Thread;
          this.originalMessageChannelKey = threadData.channelKey;

          if (threadData.channelKey && threadData.originalMessageKey) {
            const messageRef = ref(
              this.firebaseService['database'],
              `channels/${threadData.channelKey}/messages/${threadData.originalMessageKey}`
            );

            return objectVal<Message>(messageRef).pipe(
              map((msg) => {
                if (msg) {
                  const messageWithKey = {
                    ...msg,
                    key: threadData.originalMessageKey,
                  };
                  this.originalMessageDetails = messageWithKey;
                  return messageWithKey;
                } else {
                  console.warn(
                    `[ThreadComponent] Originalnachricht bei ${messageRef.toString()} nicht gefunden.`
                  );
                  this.originalMessageDetails = null;
                  return null;
                }
              })
            );
          } else {
            console.warn(
              `[ThreadComponent] Thread ${threadKey} fehlen channelKey oder originalMessageKey.`
            );
            this.originalMessageChannelKey = null;
            this.originalMessageDetails = null;
            return of(null);
          }
        } else {
          console.warn(`[ThreadComponent] Thread ${threadKey} nicht gefunden.`);
          this.originalMessageChannelKey = null;
          this.originalMessageDetails = null;
          return of(null);
        }
      }),
      catchError((error) => {
        console.error(
          '[ThreadComponent] Fehler in loadOriginalMessage Pipe:',
          error
        );
        this.originalMessageChannelKey = null;
        this.originalMessageDetails = null;
        return of(null);
      })
    );
  }

  isOwnThreadMessage(message: ThreadMessage): boolean {
    return !!this.currentUser && message.senderUid === this.currentUser.uid;
  }

  sendThreadMessage(): void {
    const text = this.threadMessageText.trim();
    if (
      !text ||
      !this.currentThreadKey ||
      !this.currentUser ||
      text === '&nbsp;'
    ) {
      console.warn('Kann Thread-Nachricht nicht senden: Fehlende Daten');
      return;
    }

    this.firebaseService
      .sendThreadMessage(this.currentThreadKey, text, this.currentUser)
      .subscribe({
        next: () => {
          this.threadMessageText = '';
          // nach unten scrollen
        },
        error: (err) => {
          console.error('Fehler beim Senden der Thread-Nachricht:', err);
        },
      });

    this.editableDiv.nativeElement.innerHTML = '';
  }

  closeThread(): void {
    this.variableService.closeThread();
  }

  toggleThread() {
    this.variableService.toggleThread();
  }

  openTagPeopleDialog() {
    const targetElement = document.querySelector('.threadwrapper');
    const inputfield = document.querySelector(
      '.textForThreadInput'
    ) as HTMLInputElement;
    const inputValue = inputfield?.value || '';

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
          mode: 'thread',
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
          '.textForThreadInput'
        ) as HTMLElement;
        if (inputField) {
          inputField.focus();
        }
      }, 400);
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
      if (reaction.userId === this.currentUser?.uid) {
        acc[reaction.emoji].reactedByUser = true;
      }
      return acc;
    }, initialAcc);
    return Object.values(grouped);
  }

  getTotalGroupedReactionsCount(
    message: Message | ThreadMessage | null
  ): number {
    if (!message) return 0;
    return this.groupReactions(message.reactions).length;
  }

  getReactionLimit(): number {
    return 7;
  }

  getDisplayedReactions(
    message: Message | ThreadMessage | null
  ): GroupedReaction[] {
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

  isShowingAll(message: Message | ThreadMessage | null): boolean {
    if (!message || !message.key) {
      return false;
    }
    return this.isShowingAllReactions.get(message.key) || false;
  }

  toggleShowAllReactions(message: Message | ThreadMessage | null): void {
    if (!message || !message.key) {
      console.warn(
        'Versuch, den Reaktionsstatus für eine Nachricht ohne Key umzuschalten.'
      );
      return;
    }
    const currentState = this.isShowingAll(message);
    this.isShowingAllReactions.set(message.key, !currentState);
    this.cdRef.markForCheck(); // Wichtig!
  }

  toggleReaction(message: Message | ThreadMessage | null, emoji: string): void {
    if (!message || !message.key || !this.currentUser) {
      console.warn(
        'toggleReaction: Fehlende Nachrichten- oder Benutzerdaten.',
        { message, emoji, user: this.currentUser }
      );
      return;
    }

    if (
      this.originalMessageDetails &&
      message.key === this.originalMessageDetails.key
    ) {
      if (!this.originalMessageChannelKey) {
        console.error(
          'toggleReaction: Channel Key für Originalnachricht nicht gefunden!',
          this.originalMessageDetails
        );
        return;
      }
      this.firebaseService
        .toggleReaction(
          this.originalMessageChannelKey,
          message.key,
          emoji,
          this.currentUser
        )
        .subscribe({
          error: (err) =>
            console.error('Fehler bei Originalnachricht-Reaktion:', err),
        });
    } else if (this.currentThreadKey) {
      this.firebaseService
        .toggleThreadReaction(
          this.currentThreadKey,
          message.key,
          emoji,
          this.currentUser
        )
        .subscribe({
          error: (err) => console.error('Fehler bei Thread-Reaktion:', err),
        });
    } else {
      console.error(
        'toggleReaction: Weder Originalnachricht noch gültiger Thread-Kontext gefunden.',
        { message, currentThreadKey: this.currentThreadKey }
      );
    }
  }

  openEmojiPickerForReaction(message: Message | ThreadMessage | null): void {
    if (!message || !message.key || !this.currentThreadKey || !this.currentUser)
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

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLElement;
    if (
      inputElement.innerHTML.includes('@') &&
      !this.lastInputValue.includes('@')
    ) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.innerHTML;
    this.variableService.setNameToFilter(this.lastInputValue);
  }

  openTaggingPerClick(event: Event) {
    const inputElement = event.target as HTMLElement;
    if (inputElement) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.innerHTML;
    this.variableService.setNameToFilter(this.lastInputValue);
  }

  preventEdit(event: MouseEvent) {
    event.preventDefault();

    const textInput = document.querySelector(
      '.textForThreadInput'
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
    const index = this.taggedPersonsInThreads.findIndex((e) => e.name === name);

    if (index !== -1) {
      this.taggedPersonsInThreads.splice(index, 1);
    }
  }

  saveCursorPosition() {
    const input = document.querySelector('.textForThreadInput') as HTMLElement;

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

  openAddSmileyToChannelDialog() {
    const targetElement = document.querySelector('.threadwrapper');
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
    const input = this.editableDiv.nativeElement;
    input.focus();

    if (!input) {
      console.error('Input field not found!');
      return;
    }

    if (!this.savedRange) {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      this.savedRange = range;
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
      this.threadMessageText = input.innerHTML;
      input.focus();
    } catch (error) {
      console.error('Error inserting emoji:', error);
    }
  }

  onInput(event: Event): void {
    this.checkForMention(event);
    const target = event.target as HTMLElement;
    this.threadMessageText = target.innerHTML;
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.sendThreadMessage();
  }

  onContentChanged(event: Event): void {
    const el = this.editableDiv.nativeElement;
    this.threadMessageText = el.innerHTML || '';
    this.checkForMention(event);
    this.editableDiv.nativeElement.focus();
  }
}
