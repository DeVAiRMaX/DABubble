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
  AfterViewChecked,
  TrackByFunction,
  HostListener,
} from '@angular/core';
import { VariablesService } from '../../variables.service';
import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ChannelMembersOverlayComponent } from './channel-members-overlay/channel-members-overlay.component';
import { ChannelWithKey } from '../interfaces/channel';
import { Message, Reaction, GroupedReaction } from '../interfaces/message';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';
import { SubService } from '../services/sub.service';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { fromEvent, Observable, of, Subscription } from 'rxjs';
import { User } from '../interfaces/user';
import { SmileyKeyboardComponent } from './smiley-keyboard/smiley-keyboard.component';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    SharedModule,
    FormsModule,
    MatTooltipModule,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrls: [
    './channel-chat.component.scss',
    './channel-chat-mobile.component.scss',
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChannelChatComponent
  implements OnInit, AfterViewChecked, OnChanges, OnDestroy, AfterViewInit
{
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
  private memberRemovedSubject: Subscription | undefined;
  private memberAddedToChannel: Subscription | undefined;
  private router: Router = inject(Router);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private readonly INPUT_EVENTS_GROUP = this.SUB_GROUP_NAME + '_InputEvents';
  private shouldFocusInput: boolean = false;

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

  constructor() {}

  ngOnInit(): void {
    this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
      (value) => {
        this.addUserToChannelOverlayIsVisible = value;
      }
    );

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

    this.subscribeToMemberChanges();
    this.onResize();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
    if (this.messageInput && this.messageInput.nativeElement) {
      setTimeout(() => {
        // this.messageInput.nativeElement.focus();
      }, 0);
    }

    if (this.channelChatBody && this.channelChatBody.nativeElement) {
      this.subService.add(
        fromEvent<Event>(this.channelChatBody.nativeElement, 'click').subscribe(
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
        fromEvent(inputEl, 'mouseup').subscribe(() => {
          this.saveCursorPositionInternal();
        }),
        this.INPUT_EVENTS_GROUP
      );

      this.subService.add(
        fromEvent<KeyboardEvent>(inputEl, 'keyup').subscribe(
          (event: KeyboardEvent) => {
            if (
              event.key.startsWith('Arrow') ||
              event.key === 'Home' ||
              event.key === 'End'
            ) {
              this.saveCursorPositionInternal();
            }
          }
        ),
        this.INPUT_EVENTS_GROUP
      );
    }
  }

  subscribeToMemberChanges(): void {
    this.memberRemovedSubject?.unsubscribe();
    this.memberAddedToChannel?.unsubscribe();

    this.memberRemovedSubject =
      this.variableService.memberRemovedFromChannel$.subscribe(() => {
        if (this.channel?.key) {
          this.getChannelMembers();
        }
      });
    this.subService.add(this.memberRemovedSubject, this.SUB_GROUP_NAME);

    this.memberAddedToChannel =
      this.variableService.memberAddedToChannel$.subscribe(() => {
        if (this.channel?.key) {
          this.getChannelMembers();
        }
      });
    this.subService.add(this.memberAddedToChannel, this.SUB_GROUP_NAME);
  }

  scrollToBottom(): void {
    try {
      if (this.channelChatBody?.nativeElement) {
        this.channelChatBody.nativeElement.scrollTop =
          this.channelChatBody.nativeElement.scrollHeight;
      }
    } catch (err) {}
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
    return `${message.key}-${this.editingMessageKey === message.key}-${
      message.reactions?.length || 0
    }-${message.editedAt || ''}`;
  };

  onNewMessageReceived() {
    this.scrollToBottom();
  }

  getChannelMembers() {
    if (!this.channel?.key) {
      this.memberAvatars = [];
      if (this.channel) this.channel.members = [];
      this.cdRef.markForCheck();
      return;
    }
    this.firebaseService
      .getChannel(this.channel.key)
      .subscribe(async (channelDoc) => {
        if (channelDoc?.members && Array.isArray(channelDoc.members)) {
          try {
            const membersData = await this.authService.getMembersData(
              channelDoc.members
            );
            if (this.channel) this.channel.members = membersData;
            this.memberAvatars = membersData.map((member) => member.avatar);
          } catch (error) {
            if (this.channel) this.channel.members = [];
            this.memberAvatars = [];
          }
        } else {
          if (this.channel) this.channel.members = [];
          this.memberAvatars = [];
        }
        this.cdRef.markForCheck();
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusInput && this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
      this.shouldFocusInput = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['channel'] &&
      changes['channel'].currentValue?.key !==
        changes['channel'].previousValue?.key
    ) {
      this.shouldFocusInput = true;
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
        this.messages$ = of([]);
      }
    } else if (
      changes['channel'] &&
      !changes['channel'].currentValue &&
      !changes['channel'].firstChange
    ) {
      this.subService.unsubscribeGroup(this.SUB_MESSAGES);
      this.messages$ = of([]);
      this.cdRef.markForCheck();
    }
    if (this.channel && this.messageInput && this.messageInput.nativeElement) {
      setTimeout(() => {
        if (this.messageInput && this.messageInput.nativeElement) {
          // this.messageInput.nativeElement.focus();
        }
      }, 0);
    }
  }

  loadMessages(channelKey: string): void {
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);
    this.messages$ = this.firebaseService.getMessagesForChannel(channelKey);
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
    this.subService.unsubscribeGroup(this.SUB_MESSAGES);
    this.subService.unsubscribeGroup('taggingDialogSub');
    this.subService.unsubscribeGroup(this.INPUT_EVENTS_GROUP);
  }

  sendMessage(): void {
    const messageHtml = this.messageInput.nativeElement.innerHTML.trim();
    const messageText = this.messageInput.nativeElement.innerText.trim();
    if (
      !messageHtml ||
      !this.channel?.key ||
      !this.currentUser?.uid ||
      messageText === '' ||
      !this.currentUser?.displayName
    ) {
      return;
    }
    this.firebaseService
      .sendMessage(
        this.channel.key,
        messageHtml,
        this.currentUser.uid,
        this.currentUser.displayName,
        this.currentUser.avatar
      )
      .subscribe({
        next: () => {
          this.messageInput.nativeElement.innerHTML = '';
          this.lastInputValue = '';
          this.variableService.setTaggedContactsFromChat([]);
          this.onNewMessageReceived();
        },
        error: (err) => {},
      });
  }

  sanitizeHtml(html: string | undefined): SafeHtml {
    if (!html) return this.sanitizer.bypassSecurityTrustHtml('');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  handleMessageTagClick(event: Event): void {
    const targetElement = event.target as HTMLElement;
    if (
      targetElement.classList.contains('user-tag') &&
      targetElement.closest('.channel-chat-message-container')
    ) {
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
      targetElement.closest('.channel-chat-message-container')
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

  shouldShowDateDivider(
    currentMessage: Message,
    previousMessage: Message | null | undefined
  ): boolean {
    if (!previousMessage) return true;
    if (!currentMessage?.time || !previousMessage?.time) return false;
    try {
      const currentDate = new Date(currentMessage.time);
      const previousDate = new Date(previousMessage.time);
      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime()))
        return false;
      return currentDate.toDateString() !== previousDate.toDateString();
    } catch (error) {
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
    this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
      data: { channelKey: this.channel.key },
    });
  }

  openAddUserToChannelDialog() {
    const targetElement = document.querySelector('.add_btn_user');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      this.dialog.open(AddUserToChannelOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: 'custom-dialog',
        data: { channelKey: this.channel?.key },
      });
    }
  }

  async openChannelMembersDialog() {
    this.firebaseService.getChannel(this.channel?.key).subscribe((user) => {
      if (this.channel) {
        this.channel.members = user?.members || [];

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

          const childEventSub =
            dialogRef.componentInstance.childEvent.subscribe(() => {
              this.openAddUserToChannelDialog();
            });

          this.subService.add(childEventSub, this.SUB_GROUP_NAME);
        }
      }
    });
  }

  startOrOpenThread(message: Message): void {
    if (!message || !message.key || !this.channel?.key || !this.currentUser) {
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
          error: (err) => {},
        });
    }
  }

  openThreadView(threadKey: string): void {
    this.activeThreadKey = threadKey;
    this.variableService.openThread(threadKey);
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

  openTaggingPerClick(char: '@' | '#', event: Event) {
    event.preventDefault();
    const inputEl = this.messageInput.nativeElement;

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

    const existingDialog = this.dialog.openDialogs.find(
      (d: MatDialogRef<any>) =>
        d.componentInstance instanceof TaggingPersonsDialogComponent &&
        d.componentInstance.triggerChar === char
    );

    if (existingDialog) {
      return;
    }

    this.messageInput.nativeElement.blur();

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
    const textInput = this.messageInput.nativeElement;
    textInput.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(textInput);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  removePersonFromTagged(name: string) {
    const index = this.taggedPersonsInChat.findIndex((e) => e.name === name);
    if (index !== -1) {
      this.taggedPersonsInChat.splice(index, 1);
    }
  }

  openAddSmileyToChannelDialog() {
    const targetElement = this.messageInput.nativeElement.closest(
      '.input-container-wrapper'
    );
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      (document.activeElement as HTMLElement)?.blur();
      const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
        panelClass: '',
        backdropClass: 'transparentBackdrop',
        position: {
          bottom: `${window.innerHeight - rect.top + 10}px`,
          left: `${rect.left}px`,
        },
        data: { channelKey: this.channel?.key },
      });

      let selectedEmoji: string | null = null;

      dialogRef.componentInstance.emojiSelected.subscribe((emoji: string) => {
        selectedEmoji = emoji;
        dialogRef.close();
      });

      dialogRef.afterClosed().subscribe(() => {
        if (selectedEmoji) {
          setTimeout(() => {
            this.insertEmojiAtCursor(selectedEmoji!);
          }, 10);
        }
      });
    }
  }

  insertEmojiAtCursor(emoji: string): void {
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
      range = selection.getRangeAt(0).cloneRange();
      if (range.collapsed && !inputEl.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(inputEl);
        range.collapse(false);
      }
    }
    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand('insertText', false, emoji)) {
      range.deleteContents();
      const textNode = document.createTextNode(emoji);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.savedRange = selection.getRangeAt(0).cloneRange();
    this.lastInputValue = inputEl.innerText;
  }

  saveCursorPosition() {
    this.saveCursorPositionInternal();
    this.openAddSmileyToChannelDialog();
  }

  toggleReaction(message: Message, emoji: string): void {
    if (!this.currentUser || !message.key || !this.channel?.key) return;
    this.firebaseService
      .toggleReaction(this.channel.key, message.key, emoji, this.currentUser)
      .subscribe({
        error: (err) => {},
      });
  }

  openEmojiPickerForReaction(message: Message): void {
    if (!this.currentUser || !message.key || !this.channel?.key) return;

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

  groupReactions(reactions: Reaction[] | undefined): GroupedReaction[] {
    if (!reactions || reactions.length === 0) return [];
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

  getTotalGroupedReactionsCount(message: Message): number {
    return this.groupReactions(message.reactions).length;
  }

  getDisplayedReactions(message: Message): GroupedReaction[] {
    const allGrouped = this.groupReactions(message.reactions);
    const limit = this.getReactionLimit();
    return this.isShowingAll(message) ? allGrouped : allGrouped.slice(0, limit);
  }

  isShowingAll(message: Message): boolean {
    if (!message || !message.key) return false;
    return this.isShowingAllReactions.get(message.key) || false;
  }

  toggleShowAllReactions(message: Message): void {
    if (!message || !message.key) return;
    const currentState = this.isShowingAll(message);
    this.isShowingAllReactions.set(message.key, !currentState);
    this.cdRef.markForCheck();
  }

  startEditing(message: Message): void {
    if (!message?.key) return;
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
        next: () => this.cancelEdit(),
        error: (err) => {},
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
