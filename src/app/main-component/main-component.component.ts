import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';
import { DirectMessageComponent } from '../shared/direct-message/direct-message.component';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { FirebaseService } from '../shared/services/firebase.service';
import { AuthService } from '../shared/services/auth.service';
import { SubService } from '../shared/services/sub.service';
import { ChannelWithKey } from '../shared/interfaces/channel';
import { userData, User } from '../../app/shared/interfaces/user';

@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [
    HeaderComponent,
    SideNavComponent,
    ChannelChatComponent,
    ThreadComponent,
    DirectMessageComponent,
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
  threadIsVisible: boolean = false;
  uid: string | null = null;
  userChannels: ChannelWithKey[] = [];
  selectedChannel: ChannelWithKey | null = null;
  selectedOtherUser: User | null = null;

  private subService: SubService = inject(SubService);
  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private variableService: VariablesService = inject(VariablesService);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private readonly GRP_UI_STATE = 'uiState';
  private readonly GRP_AUTH = 'auth';
  private readonly GRP_CHANNEL_CREATED = 'channelCreatedListener';
  private readonly GRP_DATA_KEYS = 'dataLoadKeys';
  private readonly GRP_DATA_CHANNELS = 'dataLoadChannels';
  private readonly GRP_USER_DATA = 'mainUserData';
  constructor() {}

  ngOnInit(): void {
    const sideNavSub = this.variableService.sideNavIsVisible$.subscribe(
      (isVisibleValue) => {
        if (this.sideNavIsVisible !== isVisibleValue) {
          this.sideNavIsVisible = isVisibleValue;
          this.cdRef.markForCheck();
        }
      }
    );
    const threadVisibilitySub = this.variableService.threadIsOpen$.subscribe(
      (isOpenValue) => {
        if (this.threadIsVisible !== isOpenValue) {
          this.threadIsVisible = isOpenValue;
          if (isOpenValue) {
            this.selectedChannel = null;
            this.selectedOtherUser = null;
            this.variableService.setActiveDmUser(null);
          }
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(sideNavSub, this.GRP_UI_STATE);
    this.subService.add(threadVisibilitySub, this.GRP_UI_STATE);

    const authSub = this.authService.user$.subscribe((user) => {
      if (user) {
        if (this.uid !== user.uid) {
          this.uid = user.uid;
          this.loadUserSpecificData(this.uid);
        }
      } else {
        this.uid = null;
        this.userChannels = [];
        this.selectedChannel = null;
        this.selectedOtherUser = null;
        this.variableService.setActiveDmUser(null);
        this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
      }
      this.cdRef.markForCheck();
    });
    this.subService.add(authSub, this.GRP_AUTH);

    const channelCreatedSub = this.variableService.channelCreated$.subscribe(
      () => {
        if (this.uid) {
          this.loadChannels(this.uid);
        }
      }
    );
    this.subService.add(channelCreatedSub, this.GRP_CHANNEL_CREATED);
  }

  loadUserSpecificData(uid: string): void {
    this.loadChannels(uid);
  }

  loadChannels(uid: string): void {
    this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);

    const channelSub = this.firebaseService.getChannelsForUser(uid).subscribe({
      next: (channels) => {
        const oldSelectedKey = this.selectedChannel?.key;
        this.userChannels = [...channels];

        let channelToSelect: ChannelWithKey | null = null;
        if (oldSelectedKey) {
          channelToSelect =
            this.userChannels.find((c) => c.key === oldSelectedKey) || null;
        }
        if (!channelToSelect && this.userChannels.length > 0) {
          channelToSelect = this.userChannels[0];
        }

        if (
          channelToSelect &&
          !this.selectedOtherUser &&
          (!this.selectedChannel ||
            this.selectedChannel.key !== channelToSelect.key)
        ) {
          this.onChannelSelected(channelToSelect);
        } else if (!channelToSelect && !this.selectedOtherUser) {
          this.selectedChannel = null;
        }

        this.cdRef.markForCheck();
      },
      error: (err) => {
        console.error('[MainComponent] Fehler beim Laden der Kanäle:', err);
        this.userChannels = [];
        this.selectedChannel = null;
        this.cdRef.markForCheck();
      },
    });
    this.subService.add(channelSub, this.GRP_DATA_CHANNELS);
  }

  onChannelSelected(channel: ChannelWithKey | null): void {
    if (channel) {
      this.selectedChannel = { ...channel };
      this.selectedOtherUser = null;
      this.variableService.setActiveChannel(channel);
    } else {
      this.selectedChannel = null;
      this.variableService.setActiveChannel(null);
    }
    this.cdRef.markForCheck();
  }

  onUserSelected(user: User | null): void {
    if (user) {
      this.selectedOtherUser = { ...user };
      this.selectedChannel = null;
      this.variableService.setActiveDmUser(user);
    } else {
      this.selectedOtherUser = null;
      this.variableService.setActiveDmUser(null);
    }
    this.cdRef.markForCheck();
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
