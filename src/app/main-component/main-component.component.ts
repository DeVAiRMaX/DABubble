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
import { Message } from '../shared/interfaces/message';
import { userData, User } from '../../app/shared/interfaces/user';
import { Subscription } from 'rxjs';
import { StartNewMessageComponent } from '../shared/start-new-message/start-new-message.component';

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
    StartNewMessageComponent,
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
  selectedMsg: Message | null = null;
  selectedOtherUser: User | null = null;

  private subService: SubService = inject(SubService);
  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  public variableService: VariablesService = inject(VariablesService);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private userLeavedSubscription: Subscription | undefined;
  private channelNameChangedSubscription: Subscription | undefined;

  private readonly GRP_UI_STATE = 'uiState';
  private readonly GRP_AUTH = 'auth';
  private readonly GRP_CHANNEL_CREATED = 'channelCreatedListener';
  private readonly GRP_DATA_KEYS = 'dataLoadKeys';
  private readonly GRP_DATA_CHANNELS = 'dataLoadChannels';
  private readonly GRP_USER_DATA = 'mainUserData';
  private readonly GRP_ACTIVE_VIEW = 'activeViewListeners';
  private readonly EMPTY_MESSAGE_SUB = 'isEmptyMessageSub';

  isemptyMessageVisible: boolean = true;

  constructor() { }

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
            if (this.selectedOtherUser) {
              this.selectedOtherUser = null;
              this.variableService.setActiveDmUser(null);
            }
          }
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(sideNavSub, this.GRP_UI_STATE);
    this.subService.add(threadVisibilitySub, this.GRP_UI_STATE);

    this.channelNameChangedSubscription =
      this.variableService.channelNameChanged$.subscribe(() => {
        if (this.uid != null) {
          this.loadChannels(this.uid);
        }
      });

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
        this.variableService.setActiveChannel(null);
        this.variableService.setActiveDmUser(null);
        this.variableService.closeThread();
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

    this.userLeavedSubscription =
      this.variableService.userLeavedChannel$.subscribe(() => {
        if (this.uid != null) {
          this.loadChannels(this.uid);
        }
      });
    if (this.userLeavedSubscription) {
      this.subService.add(this.userLeavedSubscription, 'userLeavedSub');
    }

    const activeChannelSub = this.variableService.activeChannel$.subscribe(
      (activeChannel) => {
        if (this.selectedChannel?.key !== activeChannel?.key) {
          this.selectedChannel = activeChannel;
          if (activeChannel) {
            this.selectedOtherUser = null;
            this.threadIsVisible = false;
          }
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(activeChannelSub, this.GRP_ACTIVE_VIEW);

    const activeDmUserSub = this.variableService.activeDmUser$.subscribe(
      (activeDM) => {
        if (this.selectedOtherUser?.uid !== activeDM?.uid) {
          this.selectedOtherUser = activeDM;
          if (activeDM) {
            this.selectedChannel = null;
            this.threadIsVisible = false;
          }
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(activeDmUserSub, this.GRP_ACTIVE_VIEW);

    const isEmptyMessage = this.variableService.isEmptyMessage$.subscribe(
      (value) => {
        this.isemptyMessageVisible = value;
      }
    );
    this.subService.add(isEmptyMessage, this.EMPTY_MESSAGE_SUB);
  }

  loadUserSpecificData(uid: string): void {
    this.loadChannels(uid);
  }

  loadChannels(uid: string): void {
    this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
    const channelSub = this.firebaseService.getChannelsForUser(uid).subscribe({
      next: (channels) => {
        const oldSelectedChannelKey = this.selectedChannel?.key;
        this.userChannels = [...channels];

        let channelToSetAsActive: ChannelWithKey | null = null;

        if (oldSelectedChannelKey) {
          channelToSetAsActive =
            this.userChannels.find((c) => c.key === oldSelectedChannelKey) ||
            null;
        }

        if (
          !channelToSetAsActive &&
          !this.selectedOtherUser &&
          this.userChannels.length > 0
        ) {
          channelToSetAsActive = this.userChannels[0];
        }

        if (
          channelToSetAsActive &&
          !this.selectedOtherUser &&
          !this.threadIsVisible
        ) {
          this.onChannelSelected(channelToSetAsActive);
        } else if (
          !channelToSetAsActive &&
          !this.selectedOtherUser &&
          !this.threadIsVisible
        ) {
          this.onChannelSelected(null);
        }

        this.cdRef.markForCheck();
      },
      error: (err) => {
        console.error('[MainComponent] Fehler beim Laden der Kanäle:', err);
        this.userChannels = [];
        this.selectedChannel = null;
        this.variableService.setActiveChannel(null);
        this.cdRef.markForCheck();
      },
    });
    this.subService.add(channelSub, this.GRP_DATA_CHANNELS);
  }


  onChannelSelected(channel: ChannelWithKey | null): void {
    if (channel) {
      this.selectedChannel = { ...channel };
      if (this.selectedOtherUser) {
        this.selectedOtherUser = null;
      }
      this.variableService.setActiveChannel(channel);
    } else {
      this.selectedChannel = null;
      this.variableService.setActiveChannel(null);
    }
    this.cdRef.markForCheck();
  }

  onChannelMsgSelected(payload: { channel: ChannelWithKey; msg: Message } | null): void {
    if (payload) {
      const { channel, msg } = payload;

      this.selectedChannel = { ...channel };
      this.selectedMsg = { ...msg };

      // Reset anderer Zustände
      if (this.selectedOtherUser) {
        this.selectedOtherUser = null;
      }

      // Channel aktiv setzen
      this.variableService.setActiveChannel(channel);

      // Nachricht aktiv setzen (z. B. für Scroll oder Highlight)
      this.variableService.setActiveMsg(msg);
    } else {
      this.selectedChannel = null;
      this.selectedMsg = null;
      this.variableService.setActiveChannel(null);
      this.variableService.setActiveMsg(null);
    }

    this.cdRef.markForCheck();
  }

  onUserSelected(user: User | null): void {
    if (user) {
      this.selectedOtherUser = { ...user };
      if (this.selectedChannel) {
        this.selectedChannel = null;
      }
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
    if (this.userLeavedSubscription) {
      this.userLeavedSubscription.unsubscribe();
    }
    this.subService.unsubscribeGroup(this.EMPTY_MESSAGE_SUB);

    if (this.channelNameChangedSubscription) {
      this.channelNameChangedSubscription.unsubscribe();
    }
  }
}
