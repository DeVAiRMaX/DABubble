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
  QueryList,
  ViewChildren,
  TrackByFunction,
} from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
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
  distinctUntilChanged,
  shareReplay,
} from 'rxjs';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import { get, ref, objectVal } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';
import { ChannelWithKey } from '../interfaces/channel';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SubService } from '../services/sub.service';

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
  @ViewChild('threadBody') threadBody!: ElementRef;
  @Input() channel!: ChannelWithKey;
  @ViewChild('editableDiv') editableDiv!: ElementRef<HTMLDivElement>;
  @ViewChildren('editThreadInput') editThreadInputs!: QueryList<
    ElementRef<HTMLTextAreaElement>
  >;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;

  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private variableService: VariablesService = inject(VariablesService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private dialog: MatDialog = inject(MatDialog);
  private savedRange: Range | null = null;
  private destroy$ = new Subject<void>();
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private subService: SubService = inject(SubService);
  private readonly SUB_GROUP_NAME = 'threadSubs';

  editingThreadMessageKey: string | null = null;
  editThreadMessageText: string = '';
  isOpen: boolean = false;
  currentThreadKey: string | null = null;
  threadMessages$: Observable<ThreadMessage[]> = of([]);
  originalMessage$: Observable<Message | null> = of(null);
  currentUser: User | null = null;
  originalMessageDetails: Message | null = null;
  originalMessageChannelKey: string | null = null;

  currentThreadChannelName$: Observable<string | null> = of(null);

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

    this.currentThreadChannelName$ = this.variableService.activeThreadKey$.pipe(
      distinctUntilChanged(),
      switchMap((threadKey) => {
        if (!threadKey) {
          return of(null);
        }
        const threadDataRef = ref(
          this.firebaseService['database'],
          `Threads/${threadKey}`
        );
        return from(get(threadDataRef)).pipe(
          switchMap((threadSnapshot) => {
            if (threadSnapshot.exists()) {
              const threadData = threadSnapshot.val() as Thread;
              if (threadData.channelKey) {
                return this.firebaseService
                  .getChannel(threadData.channelKey)
                  .pipe(
                    map((channel) =>
                      channel ? channel.channelName : 'Channel'
                    )
                  );
              }
            }
            return of('Channel');
          }),
          catchError((error) => {
            console.error(
              '[ThreadComponent] Error loading channel name for thread header:',
              error
            );
            return of('Channel');
          })
        );
      }),
      shareReplay(1)
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
    if (this.editableDiv && this.editableDiv.nativeElement) {
      const el = this.editableDiv.nativeElement;
      fromEvent(el, 'keyup')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cacheCurrentRange());
      fromEvent(el, 'mouseup')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cacheCurrentRange());
    }

    if (this.threadBody && this.threadBody.nativeElement) {
      this.subService.add(
        fromEvent<Event>(this.threadBody.nativeElement, 'click').subscribe(
          (event: Event) => {
            this.handleMessageTagClick(event);
          }
        ),
        this.SUB_GROUP_NAME
      );
    }
  }

  private cacheCurrentRange() {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      this.editableDiv.nativeElement.contains(sel.anchorNode)
    ) {
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
    let messageHtml = this.editableDiv.nativeElement.innerHTML;
    messageHtml = messageHtml.replace(/(<br\s*\/?>|\s)+$/, '');
    messageHtml = messageHtml.trim();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageHtml;
    const cleanedTextContent = tempDiv.innerText.trim();
    const hasMeaningfulTags =
      tempDiv.querySelector('span.user-tag, span.channel-tag, img') !== null;

    if (!cleanedTextContent && !hasMeaningfulTags) {
      console.warn(
        'Nachricht ist nach Bereinigung leer und wird nicht gesendet.'
      );
      this.editableDiv.nativeElement.innerHTML = '';
      this.threadMessageText = '';
      this.variableService.setTaggedContactsFromThread([]);
      return;
    }

    if (
      !this.currentThreadKey ||
      !this.currentUser ||
      !this.currentUser.displayName
    ) {
      console.warn(
        'Kann Thread-Nachricht nicht senden: Fehlende Metadaten (Thread-Key, User).',
        {
          currentThreadKey: this.currentThreadKey,
          currentUser: this.currentUser,
        }
      );
      return;
    }

    this.firebaseService
      .sendThreadMessage(this.currentThreadKey, messageHtml, this.currentUser)
      .subscribe({
        next: () => {
          this.editableDiv.nativeElement.innerHTML = '';
          this.threadMessageText = '';
          this.variableService.setTaggedContactsFromThread([]);
        },
        error: (err) => {
          console.error('Fehler beim Senden der Thread-Nachricht:', err);
        },
      });
  }

  closeThread(): void {
    this.variableService.closeThread();
  }

  toggleThread() {
    this.variableService.toggleThread();
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
    this.cdRef.markForCheck();
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
      message.key === this.originalMessageDetails.key &&
      this.originalMessageChannelKey
    ) {
      this.firebaseService
        .toggleReaction(
          this.originalMessageChannelKey,
          message.key,
          emoji,
          this.currentUser
        )
        .subscribe({
          error: (err) =>
            console.error(
              'Fehler bei Originalnachricht-Reaktion im Thread:',
              err
            ),
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
          error: (err) =>
            console.error('Fehler bei Thread-Antwort-Reaktion:', err),
        });
    } else {
      console.error(
        'toggleReaction: Weder Originalnachricht noch gültiger Thread-Kontext für Reaktion gefunden.',
        { message, currentThreadKey: this.currentThreadKey }
      );
    }
  }

  openEmojiPickerForReaction(message: Message | ThreadMessage | null): void {
    if (!message || !message.key || !this.currentUser) return;

    (document.activeElement as HTMLElement)?.blur();

    const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
      panelClass: 'emoji-picker-dialog-reaction',
      backdropClass: 'transparentBackdrop',
    });

     dialogRef.afterOpened().subscribe(() => {
    const el = document.querySelector('.search') as HTMLElement;
    el?.focus(); 
  });

    dialogRef.componentInstance.emojiSelected.subscribe(
      (selectedEmoji: string) => {
        this.toggleReaction(message, selectedEmoji);
      }
    );
  }

  isInsideTagSpan(node: Node | null): boolean {
    let currentNode = node;
    while (currentNode && currentNode !== this.editableDiv.nativeElement) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as HTMLElement;
        if (
          element.classList.contains('user-tag') ||
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

  handleMessageTagClick(event: Event): void {
    const targetElement = event.target as HTMLElement;
    const messageContainer = targetElement.closest(
      '.msg-left-container, .msg-right-container'
    );
    if (targetElement.classList.contains('user-tag') && messageContainer) {
      event.preventDefault();
      const userId = targetElement.getAttribute('data-user-id');

      if (userId && this.currentUser?.uid) {
        if (userId === this.currentUser.uid) {
          this.firebaseService
            .ensureDirectMessageConversation(
              this.currentUser.uid,
              this.currentUser.uid
            )
            .subscribe((conversationId) => {
              this.variableService.setActiveChannel(null);
              this.variableService.setActiveDmUser(this.currentUser!);
              this.variableService.closeThread();
            });
          return;
        }
        this.firebaseService
          .ensureDirectMessageConversation(this.currentUser.uid, userId)
          .subscribe((conversationId) => {
            this.firebaseService.getUserData(userId).subscribe((dmUserData) => {
              if (dmUserData) {
                const targetUser: User = {
                  uid: dmUserData.uid,
                  displayName: dmUserData.displayName,
                  email: dmUserData.email,
                  avatar: (dmUserData as any).avatar,
                  channelKeys: dmUserData.channelKeys || [],
                };
                this.variableService.setActiveChannel(null);
                this.variableService.setActiveDmUser(targetUser);
                this.variableService.closeThread();
              }
            });
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
            this.variableService.setActiveDmUser(null);
            this.variableService.setActiveChannel(channelWithKey);
            this.variableService.closeThread();
          }
        });
      }
    }
  }
  // ###############################################################
  // ###############################################################
  // ###############################################################

  openTagPeopleOrChannelDialog(char: '@' | '#', filterPrefix: string) {
    const targetElement = this.messageInput.nativeElement;
    const rect = targetElement.getBoundingClientRect();
    this.variableService.setNameToFilter(filterPrefix);

    const existingDialog = this.dialog.openDialogs.find(
      (d: MatDialogRef<any>) =>
        d.componentInstance instanceof TaggingPersonsDialogComponent &&
        d.componentInstance.triggerChar === char
    );

    if (existingDialog) {
      return;
    }

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

    const contactSelectedSub =
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
    this.subService.add(contactSelectedSub, 'taggingDialogSub');

    dialogRef.afterClosed().subscribe(() => {
      this.subService.unsubscribeGroup('taggingDialogSub');
      this.messageInput.nativeElement.focus();
      if (
        this.savedRange &&
        this.messageInput.nativeElement.contains(
          this.savedRange.commonAncestorContainer
        )
      ) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(this.savedRange);
        }
      }
      const currentTextInInput = this.messageInput.nativeElement.innerText;
      const lastCharInInput = currentTextInInput.slice(-1);
      if (lastCharInInput !== '@' && lastCharInInput !== '#') {
        this.variableService.setNameToFilter('');
      } else {
        this.variableService.setNameToFilter(lastCharInInput);
      }
    });
  }

  // ###############################################################
  // ###############################################################
  // ###############################################################
  // ###############################################################

  insertTagIntoInput(name: string, id: string, type: 'user' | 'channel'): void {
    const inputEl = this.messageInput.nativeElement;
    inputEl.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    let range: Range;
    if (
      this.savedRange &&
      inputEl.contains(this.savedRange.commonAncestorContainer)
    ) {
      range = this.savedRange.cloneRange();
    } else {
      range = selection.getRangeAt(0).cloneRange();
      if (range.collapsed && !inputEl.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(inputEl);
        range.collapse(false);
      }
    }
    selection.removeAllRanges();
    selection.addRange(range);

    const container = range.startContainer;
    let offset = range.startOffset;
    const activeFilterPrefix = this.variableService.getNameToFilter();
    let successfullyDeletedPrefix = false;

    if (
      activeFilterPrefix &&
      (activeFilterPrefix.startsWith('@') || activeFilterPrefix.startsWith('#'))
    ) {
      if (
        container.nodeType === Node.TEXT_NODE &&
        offset >= activeFilterPrefix.length
      ) {
        const textNode = container as Text;
        const textContent = textNode.textContent || '';
        const textBeforeCursor = textContent.substring(0, offset);

        if (textBeforeCursor.endsWith(activeFilterPrefix)) {
          range.setStart(textNode, offset - activeFilterPrefix.length);
          try {
            range.deleteContents();
            successfullyDeletedPrefix = true;
          } catch (e) {}
          offset = range.startOffset;
        }
      }
    }

    if (!successfullyDeletedPrefix) {
      if (!range.collapsed) {
        try {
          range.deleteContents();
          successfullyDeletedPrefix = true;
        } catch (e) {}
        offset = range.startOffset;
      } else if (container.nodeType === Node.TEXT_NODE && offset > 0) {
        const textNode = container as Text;
        const charBefore = (textNode.textContent || '')[offset - 1];
        const expectedTrigger = type === 'user' ? '@' : '#';
        if (charBefore === expectedTrigger) {
          try {
            range.setStart(textNode, offset - 1);
            range.deleteContents();
            successfullyDeletedPrefix = true;
            offset = range.startOffset;
          } catch (e) {}
        }
      }
    }

    const tagSpan = document.createElement('span');
    tagSpan.classList.add(type === 'user' ? 'user-tag' : 'channel-tag');
    tagSpan.setAttribute(`data-${type}-id`, id);
    tagSpan.setAttribute('contenteditable', 'false');
    tagSpan.innerText = (type === 'user' ? '@' : '#') + name;

    const spaceChar = '\u00A0';
    const actualSpaceNode = document.createTextNode(spaceChar);

    try {
      range.insertNode(tagSpan);
      range.setStartAfter(tagSpan);
      range.collapse(true);
      range.insertNode(actualSpaceNode);
      range.setStartAfter(actualSpaceNode);
      range.collapse(true);

      selection.removeAllRanges();
      selection.addRange(range);
      this.savedRange = range.cloneRange();
    } catch (e) {
      const fallbackText = tagSpan.innerText + spaceChar;
      document.execCommand('insertText', false, fallbackText);
      this.saveCursorPositionInternal();
    }

    this.lastInputValue = inputEl.innerText;
    this.variableService.setNameToFilter('');
  }

  preventEdit(event: MouseEvent) {
    event.preventDefault();
    const textInput = this.editableDiv.nativeElement;
    if (!textInput) return;
    textInput.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(textInput);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      this.savedRange = range.cloneRange();
    }
  }

  removePersonFromTagged(name: string) {
    const index = this.taggedPersonsInThreads.findIndex((e) => e.name === name);
    if (index !== -1) {
      this.taggedPersonsInThreads.splice(index, 1);
      this.variableService.setTaggedContactsFromThread([
        ...this.taggedPersonsInThreads,
      ]);
    }
  }

  saveCursorPosition() {
    this.cacheCurrentRange();
    this.openAddSmileyToThreadDialog();
  }

  openAddSmileyToThreadDialog() {
    const targetElement = this.editableDiv.nativeElement.closest(
      '.input-container-wrapper'
    );
    if (targetElement) {
      (document.activeElement as HTMLElement)?.blur();
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
        panelClass: ['emoji-picker-dialog', 'thread-emoji-picker'],
        backdropClass: 'transparentBackdrop',
        position: {
          bottom: `${window.innerHeight - rect.top + 10}px`,
          left: `${rect.left}px`,
        },
      });

      let selectedEmoji: string | null = null;

      dialogRef.componentInstance.emojiSelected.subscribe(
        (emoji: string) => {
          selectedEmoji = emoji;
          dialogRef.close(); 
        });

        dialogRef.afterClosed().subscribe(() => {
          if(selectedEmoji){
            setTimeout(() => {
              this.insertEmojiAtCursor(selectedEmoji!);
            }, 10);
          }
        });
    } else {
      console.warn(
        "Could not find '.input-container-wrapper' for emoji picker positioning in thread."
      );
    }
  }

  insertEmojiAtCursor(emoji: string) {
    const inputEl = this.editableDiv.nativeElement;
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
      range = selection.getRangeAt(0).cloneRange();
      if (range.collapsed && !inputEl.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(inputEl);
        range.collapse(false);
      }
    }
    selection.removeAllRanges();
    selection.addRange(range);

    if (!range.collapsed) {
      range.deleteContents();
    }

    const emojiNode = document.createTextNode(emoji);
    range.insertNode(emojiNode);

    range.setStartAfter(emojiNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    this.savedRange = range.cloneRange();
    this.threadMessageText = inputEl.innerHTML;
    this.lastInputValue = inputEl.innerText;
  }

  onInput(event: Event): void {
    this.checkForMention(event);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendThreadMessage();
    }
  }

  onContentChanged(event: Event): void {
    const el = this.editableDiv.nativeElement;
    this.threadMessageText = el.innerHTML;
    this.checkForMention(event);
  }

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLDivElement;
    if (!this.savedRange) {
      this.saveCursorPositionInternal();
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

    if (charBeforeCursor === '@') {
      if (this.isInsideTagSpan(range.startContainer)) {
        this.lastInputValue = fullInputText;
        return;
      }
      this.openTagPeopleOrChannelDialog('@', currentWordBeforeCursor || '@');
    } else if (charBeforeCursor === '#') {
      if (this.isInsideTagSpan(range.startContainer)) {
        this.lastInputValue = fullInputText;
        return;
      }
      this.openTagPeopleOrChannelDialog('#', currentWordBeforeCursor || '#');
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

  saveCursorPositionInternal() {
    const inputEl = this.messageInput?.nativeElement;
    if (!inputEl) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (
        inputEl.contains(currentRange.commonAncestorContainer) ||
        document.activeElement === inputEl
      ) {
        this.savedRange = currentRange.cloneRange();
      }
    } else if (document.activeElement === inputEl) {
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      range.collapse(true);
      this.savedRange = range;
    }
  }

  onInputForTagging(event: Event) {
    this.saveCursorPositionInternal();
    this.checkForMention(event);
  }

  startEditingThreadMessage(message: ThreadMessage): void {
    if (!message?.key) {
      console.warn(
        '[ThreadComponent] Bearbeitung kann nicht gestartet werden: Nachrichten-Key fehlt.'
      );
      return;
    }
    this.editingThreadMessageKey = message.key;
    this.editThreadMessageText = message.message;
    this.cdRef.detectChanges();

    setTimeout(() => {
      const editInputElem = this.editThreadInputs.find((input) => {
        const container = input.nativeElement.closest(
          '.msg-right-container.ownMessage.editing'
        );
        return !!(
          container &&
          container.getAttribute('data-message-key') ===
            this.editingThreadMessageKey
        );
      })?.nativeElement;

      if (editInputElem) {
        editInputElem.focus();
        const length = editInputElem.value.length;
        editInputElem.setSelectionRange(length, length);
      }
    }, 0);
  }

  saveEditThreadMessage(message: ThreadMessage): void {
    const newText = this.editThreadMessageText.trim();

    if (
      !this.editingThreadMessageKey ||
      !this.currentThreadKey ||
      !newText ||
      newText === message.message
    ) {
      this.cancelEditThreadMessage();
      return;
    }

    this.firebaseService
      .updateThreadMessage(
        this.currentThreadKey,
        this.editingThreadMessageKey,
        newText
      )
      .subscribe({
        next: () => {
          this.cancelEditThreadMessage();
        },
        error: (err: any) => {
          console.error(
            '[ThreadComponent] Fehler beim Speichern der Bearbeitung der Thread-Nachricht:',
            err
          );
          this.cancelEditThreadMessage();
        },
      });
  }

  cancelEditThreadMessage(): void {
    this.editingThreadMessageKey = null;
    this.editThreadMessageText = '';
    this.cdRef.markForCheck();
  }

  handleEditThreadEnter(event: KeyboardEvent, message: ThreadMessage): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditThreadMessage(message);
    }
  }

  trackByThreadMessageKey: TrackByFunction<ThreadMessage> = (
    index: number,
    message: ThreadMessage
  ): string => {
    const reactionsArray = Array.isArray(message.reactions)
      ? message.reactions
      : [];
    const reactionsKey = reactionsArray
      .map((r) => r.userId + r.emoji)
      .join('_');
    return `${message.key}-${this.editingThreadMessageKey === message.key}-${
      message.editedAt || ''
    }-${reactionsKey}`;
  };

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
