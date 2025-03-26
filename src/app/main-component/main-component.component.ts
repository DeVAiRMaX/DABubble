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
import { SubService } from '../shared/services/sub.service';
import { Channel, ChannelWithKey } from '../shared/interfaces/channel';

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
export class MainComponentComponent implements OnInit, OnDestroy {
  sideNavIsVisible: boolean = true;
  threadIsVisible: boolean = true;
  uid: string | null = '';
  channelKeys: string[] = [];
  userChannels: ChannelWithKey[] = [];

  private subService: SubService = inject(SubService);
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
    this.subService.add(
      this.variableService.sideNavIsVisible$.subscribe((value) => {
        this.sideNavIsVisible = value;
      })
    );

    this.subService.add(
      this.variableService.threadIsClosed$.subscribe((value) => {
        this.threadIsVisible = value;
      })
    );

    this.subService.add(
      this.authService.user$.subscribe((user) => {
        if (user) {
          this.uid = user.uid;
          this.loadUserSpecificData(this.uid);
        } else {
          this.uid = null;
          this.channelKeys = [];
          this.userChannels = [];
        }
      })
    );
  }

  trackByChannelKey(index: number, channel: ChannelWithKey): string {
    // Typ hier auch verwenden
    return channel.key;
  }

  loadUserSpecificData(uid: string): void {
    this.subService.unsubscribeAll();

    this.subService.add(
      this.firebaseService.getUserChannelKeys(uid).subscribe({
        next: (keys) => {
          this.channelKeys = keys;
          console.log('Channel Keys:', this.channelKeys);
          this.loadChannels(uid);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Channel Keys:', err);
          this.channelKeys = [];
        },
      })
    );
  }

  loadChannels(uid: string): void {
    this.subService.unsubscribeAll();
    this.subService.add(
      this.firebaseService.getChannelsForUser(uid).subscribe({
        next: (channels) => {
          this.userChannels = channels;
          this.renderChannels(this.userChannels);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Channels:', err);
          this.userChannels = [];
        },
      })
    );
  }

  renderChannels(userChannels: Channel[]) {
    console.log(userChannels);
  }

  toggleSideNav(): void {
    this.variableService.toggleSideNav();
  }

  toggleThread(): void {
    this.variableService.toggleThread();
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeAll();
  }
}
