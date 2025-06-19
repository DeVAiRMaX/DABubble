import { Component, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { SubService } from '../services/sub.service';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TaggingPersonsDialogComponent } from '../channel-chat/tagging-persons-dialog/tagging-persons-dialog.component';
import { ChannelWithKey } from '../interfaces/channel';
import { User } from '../interfaces/user';
import { FirebaseService } from '../services/firebase.service';
import { SmileyKeyboardComponent } from '../channel-chat/smiley-keyboard/smiley-keyboard.component';
import { SharedModule } from '../../shared';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-start-new-message',
  standalone: true,
  imports: [CommonModule, SharedModule, NgIf],
  templateUrl: './start-new-message.component.html',
  styleUrls: ['./start-new-message.component.scss'],
})
export class StartNewMessageComponent {

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  @Input() channel!: ChannelWithKey;
  private savedRange: Range | null = null;
  private subService: SubService = inject(SubService);
  private variableService: VariablesService = inject(VariablesService);
  private dialog: MatDialog = inject(MatDialog);
    private authService: AuthService = inject(AuthService);
   private firebaseService: FirebaseService = inject(FirebaseService);
    taggedPersonsInChat = this.variableService.getTaggedContactsFromChat();
  lastInputValue: string = '';
searchResultsState: boolean = false;
  currentUser: User | null = null;
  realUser: User | null = null;
  searchValue: string = '';
   searchResults: any[] = [];
   addedUsersNewMessage: any[] = [];
   addedChannelsNewMessage: any[] = [];
   textFieldIsEmpty: boolean = false;
   channelAccessDenied: boolean = false;


ngOnInit(): void {
this.realUser = this.authService.getCurrentUser();
console.log(this.realUser);
  
}

 onInputForTagging(event: Event) {
    this.saveCursorPositionInternal();
    this.checkForMention(event);
    this.checkIfInptutIsEmpty();
  }

  checkIfInptutIsEmpty() {
    const inputEl = this.messageInput?.nativeElement;
    if (!inputEl) return;
    const messageText = inputEl.innerText.trim();
    if(messageText === '') {
      this.textFieldIsEmpty = true;
    }
    else {this.textFieldIsEmpty = false;}
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



   handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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
         
        },
        error: (err) => {},
      });
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

 saveCursorPosition() {
    this.saveCursorPositionInternal();
    this.openAddSmileyToChannelDialog();
  }



    openAddSmileyToChannelDialog() {
      const targetElement = this.messageInput.nativeElement.closest(
        '.input-container-wrapper'
      );
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const dialogRef = this.dialog.open(SmileyKeyboardComponent, {
          panelClass: '',
          backdropClass: 'transparentBackdrop',
          position: {
            bottom: `${window.innerHeight - rect.top + 10}px`,
            left: `${rect.left}px`,
          },
          data: { channelKey: this.channel?.key },
        });
        dialogRef.componentInstance.emojiSelected.subscribe(
          (selectedEmoji: string) => {
            this.insertEmojiAtCursor(selectedEmoji);
          }
        );
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


   async onSearchChange(): Promise<void> {
    const data = await this.firebaseService.getDatabaseData();

    if (this.searchValue.trim().length > 0) {
      this.searchResultsState = true;
     
      const lowerSearchTerm = this.searchValue.toLowerCase();

      const channels = data.channels
        ? Object.entries(data.channels as Record<string, any>)
          .filter(([id, channel]) =>
            channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, channel]) => ({
            id: id,                
            type: 'Channel',
            data: channel,
          }))
        : [];


      const users = data.users
        ? Object.entries(data.users as Record<string, any>)
          .filter(([id, user]) =>
            user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, user]) => ({
            id: id,
            type: 'User',
            data: user,
          }))
        : [];

        // const massages = data.direct-messages
        // ? Object.entries(data.direct-messages as Record<string, any>)
        //   .filter(([id, channel]) =>
        //     channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
        //   )
        //   .map(([id, channel]) => ({
        //     id: id,                
        //     type: 'Channel',
        //     data: channel,
        //   }))
        // : [];

      this.searchResults = [
        ...channels,
        ...users,
      ];

      this.searchResults = this.searchResults.filter(result => {
  if (result.type === 'Channel') {
    return !this.addedChannelsNewMessage.some(c => c.id === result.id);
  } else if (result.type === 'User') {
    return !this.addedUsersNewMessage.some(u => u.id === result.id);
  }
  return true;
});


    } else {
      this.searchResultsState = false;
      this.searchResults = [];
      

    }

   await this.authUser();
  }


  async authUser(){
   const authSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      
    });
   
   
}

addUserToNewMessage(result: any, index: number) {
  
  if(result.type === 'User') {
  
   this.addedUsersNewMessage.push(result);
  }else if(result.type === 'Channel') {
   
    this.addedChannelsNewMessage.push(result);
  }
 

  this.searchResults.splice(index, 1);
}
  

removeUserFromNewMessage(user: any) {
  if (user.type === 'User') {
    const index = this.addedUsersNewMessage.indexOf(user);
    if (index > -1) this.addedUsersNewMessage.splice(index, 1);
  } else if (user.type === 'Channel') {
    const index = this.addedChannelsNewMessage.indexOf(user);
    if (index > -1) this.addedChannelsNewMessage.splice(index, 1);
  }

  this.onSearchChange();
}

printChannelNames() {
  this.currentUser?.channelKeys?.forEach(channelKey => {
    this.firebaseService.getChannel(channelKey).subscribe({
      next: (channel) => {
        if (channel) {
          console.log('Channel Name:', channel.channelName);
        } else {
          console.log(`Kein Channel gefunden für Key: ${channelKey}`);
        }
      },
      error: (err) => {
        console.error(`Fehler beim Laden des Channels mit Key ${channelKey}:`, err);
      }
    });
  });
}

async sendNewMessages() {
  const realUserID = this.realUser?.uid;
  const displayName = this.realUser?.displayName || 'Unbekannt';
  const messageText = this.messageInput.nativeElement.innerText.trim();

  if (!realUserID) {
    console.warn('realUserID is undefined, cannot send message.');
    return;
  }

  if (!messageText) {
    this.textFieldIsEmpty = true;
    return;
  }


  const sendPromises: Promise<any>[] = [];
  const listObj = await this.firebaseService.getAllDirectMessageKeys();

  if(this.addedUsersNewMessage.length === 0 && this.addedChannelsNewMessage.length === 0) {
    return;
  }

  this.addedUsersNewMessage.forEach((element) => {
    const userToCheckUID = element.data.uid;

    Object.keys(listObj).forEach((chatKey) => {
      if (chatKey.includes(realUserID) && chatKey.includes(userToCheckUID)) {
        console.log('Chat gefunden für User:', chatKey);
       const sendPromise = firstValueFrom(
  this.firebaseService.sendDirectMessage(chatKey, messageText, this.realUser!)
);
        sendPromises.push(sendPromise);
      }
    });
  });

  this.addedChannelsNewMessage.forEach((element) => {
    const channelKey = element.id;
    const channelMembers = element.data.members || [];

    if (channelMembers.includes(realUserID)) {
      console.log('Nachricht wird an Channel gesendet:', channelKey);
      const sendPromise = firstValueFrom(
  this.firebaseService.sendMessage(channelKey, messageText, realUserID, displayName, this.realUser!.avatar)
);
      sendPromises.push(sendPromise);
    } else {
      console.log('Sie haben keinen Zugriff auf diesen Channel:', channelKey);
      this.channelAccessDenied = true;
    }
  });

  try {
    await Promise.all(sendPromises);
    this.messageInput.nativeElement.innerText = '';
    console.log('Alle Nachrichten erfolgreich gesendet.');
    this.addedUsersNewMessage = [];
    this.addedChannelsNewMessage = [];
    this.searchValue = '';
    this.searchResultsState = false;
    this.textFieldIsEmpty = false;
    this.channelAccessDenied = false;
    
  } catch (err) {
    console.error('Fehler beim Senden einer oder mehrerer Nachrichten:', err);
  }
}
}
