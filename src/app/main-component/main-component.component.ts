import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { FirebaseService } from '../shared/services/firebase.service';
import { AuthService } from '../shared/services/auth.service';
import { User } from '@angular/fire/auth';
import { Channel } from '../shared/interfaces/channel';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [
    HeaderComponent,
    SideNavComponent,
    ChannelChatComponent,
    ThreadComponent,
    CommonModule,
  ],
  templateUrl: './main-component.component.html',
  styleUrl: './main-component.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),

      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class MainComponentComponent implements OnInit {
  sideNavIsVisible: boolean = true;
  threadIsVisible: boolean = true;
  uid: string | null = '';
  channelKeys: string[] = [];
  userChannels: Channel[] = [];

  private sideNavSub: Subscription | null = null;
  private threadSub: Subscription | null = null;
  private authUserSub: Subscription | null = null;
  private channelKeysSub: Subscription | null = null;
  private userChannelsSub: Subscription | null = null;

  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private variableService: VariablesService = inject(VariablesService);

  constructor() {
    this.variableService.sideNavIsVisible$.subscribe((value) => {
      this.sideNavIsVisible = value;
    });

    this.variableService.threadIsClosed$.subscribe((value) => {
      this.threadIsVisible = value;
    });
  }

  ngOnInit(): void {
    this.sideNavSub = this.variableService.sideNavIsVisible$.subscribe(
      (value) => {
        this.sideNavIsVisible = value;
      }
    );
    this.threadSub = this.variableService.threadIsClosed$.subscribe((value) => {
      this.threadIsVisible = value;
    });

    this.authUserSub = this.authService.user$.subscribe((user) => {
      if (user) {
        this.uid = user.uid;
        console.log('Benutzer eingeloggt, UID:', this.uid);
        this.loadUserSpecificData(this.uid);
      } else {
        this.uid = null;
        console.log('Benutzer ist nicht eingeloggt.');
        this.channelKeys = [];
        this.userChannels = [];
      }
    });
  }

  loadUserSpecificData(uid: string): void {
    this.channelKeysSub?.unsubscribe();
    this.userChannelsSub?.unsubscribe();

    this.channelKeysSub = this.firebaseService
      .getUserChannelKeys(uid)
      .subscribe({
        next: (keys) => {
          this.channelKeys = keys;
          console.log('Channel Keys:', this.channelKeys);
          this.loadChannels(uid);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Channel Keys:', err);
          this.channelKeys = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.sideNavSub?.unsubscribe();
    this.threadSub?.unsubscribe();
    this.authUserSub?.unsubscribe();
    this.channelKeysSub?.unsubscribe();
    this.userChannelsSub?.unsubscribe();
  }

  loadChannels(uid: string): void {
    console.log('Lade Channels für Benutzer:', uid);
    this.userChannelsSub?.unsubscribe();

    this.userChannelsSub = this.firebaseService
      .getChannelsForUser(uid)
      .subscribe({
        next: (channels) => {
          this.userChannels = channels;
          console.log('Geladene Channels:', this.userChannels);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Channels:', err);
          // this.userChannels = [];
        },
      });
  }

  toggleSideNav(): void {
    this.variableService.toggleSideNav();
  }

  toggleThread(): void {
    this.variableService.toggleThread();
  }
}
