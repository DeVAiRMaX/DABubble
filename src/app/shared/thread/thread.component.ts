import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
  Subscription,
  catchError,
  from,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Message } from '../interfaces/message';
import { get, ref } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
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
  private variableService: VariablesService = inject(VariablesService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private dialog: MatDialog = inject(MatDialog);

  isOpen: boolean = false;
  currentThreadKey: string | null = null;
  threadMessages$: Observable<ThreadMessage[]> = of([]);
  originalMessage$: Observable<Message | null> = of(null);
  currentUser: User | null = null;

  private subscriptions = new Subscription();

  threadMessageText: string = '';
  lastInputValue: string = '';
  taggedPersonsInThreads = this.variableService.getTaggedcontactsFromThreads();
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
            // Lade Thread-Nachrichten
            this.threadMessages$ = this.firebaseService.getThreadMessages(key);
            // Lade Original-Nachricht (optional, für Kontext)
            this.originalMessage$ = this.loadOriginalMessage(key);
            return of(key); // Nur um die Pipe am Laufen zu halten
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

  ngOnDestroy(): void {
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
          if (threadData.channelKey && threadData.originalMessageKey) {
            const messageRef = ref(
              this.firebaseService['database'],
              `channels/${threadData.channelKey}/messages/${threadData.originalMessageKey}`
            );
            return from(get(messageRef)).pipe(
              map((messageSnapshot) =>
                messageSnapshot.exists()
                  ? (messageSnapshot.val() as Message)
                  : null
              )
            );
          }
        }
        return of(null); // Thread oder Keys nicht gefunden
      }),
      catchError((error) => {
        console.error('Fehler beim Laden der Originalnachricht:', error);
        return of(null);
      })
    );
  }

  isOwnThreadMessage(message: ThreadMessage): boolean {
    return !!this.currentUser && message.senderUid === this.currentUser.uid;
  }

  sendThreadMessage(): void {
    const text = this.threadMessageText.trim(); // Hole Text aus Input (z.B. ngModel oder ViewChild)
    if (!text || !this.currentThreadKey || !this.currentUser) {
      console.warn('Kann Thread-Nachricht nicht senden: Fehlende Daten');
      return;
    }

    this.firebaseService
      .sendThreadMessage(this.currentThreadKey, text, this.currentUser)
      .subscribe({
        next: () => {
          console.log('Thread-Nachricht erfolgreich gesendet.');
          this.threadMessageText = ''; // Input leeren
          // Optional: Scroll zum Ende
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
        data:{
          mode: 'thread'
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

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (
      inputElement.value.includes('@') &&
      !this.lastInputValue.includes('@')
    ) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value;
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
      console.log(`Person ${name} entfernt.`);
    } else {
      console.log(`Person ${name} nicht gefunden.`);
    }
  }
}
