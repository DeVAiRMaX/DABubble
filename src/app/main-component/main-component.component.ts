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
import { RouterLink, ActivatedRoute } from '@angular/router';

interface User {
  avatar: string;
  channelKeys: string[];
  displayName: string;
  email: string;
  password: string;
  uid: string;
}

@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [
    HeaderComponent,
    SideNavComponent,
    ChannelChatComponent,
    ThreadComponent,
    CommonModule,
    RouterLink
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
  selectedChannel: ChannelWithKey | undefined = undefined;
  userIdFromUrl: any;
  userData: User | null = null;

  private subService: SubService = inject(SubService);
  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private variableService: VariablesService = inject(VariablesService);
  private readonly route = inject(ActivatedRoute);

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
    this.userIdFromUrl = this.route.snapshot.paramMap.get('id');

    this.renderUserDate(this.userIdFromUrl);

  }

  renderUserDate(userIdFromUrl: string) {
    this.firebaseService.resiveUserData(userIdFromUrl)
      .then(userData => {
        this.userData = userData as User;
        console.log(this.userData);
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
      });
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
    const channelSub = this.firebaseService.getChannelsForUser(uid).subscribe({
      next: (channels) => {
        this.userChannels = [...channels];
        if (this.userChannels.length > 0) {
          if (
            !this.selectedChannel ||
            !this.userChannels.some((c) => c.key === this.selectedChannel!.key)
          ) {
            this.selectedChannel = { ...this.userChannels[0] };
          } else {
            const updatedSelected = this.userChannels.find(
              (c) => c.key === this.selectedChannel!.key
            );
            if (updatedSelected) {
              this.selectedChannel = { ...updatedSelected };
            } else {
              this.selectedChannel = undefined;
            }
          }
        } else {
          this.selectedChannel = undefined;
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden der Channels:', err);
        this.userChannels = [];
        this.selectedChannel = undefined;
      },
    });
    this.subService.add(channelSub);
  }

  onChannelSelected(channel: ChannelWithKey): void {
    this.selectedChannel = { ...channel };
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
