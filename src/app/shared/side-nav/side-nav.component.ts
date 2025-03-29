import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SharedModule } from '../../shared';
import { VariablesService } from '../../variables.service';
import { CommonModule } from '@angular/common';
import { ChannelCreateOverlayComponent } from '../channel-create-overlay/channel-create-overlay.component';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { ChannelWithKey } from '../interfaces/channel';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [
    SharedModule,
    CommonModule,
    ChannelCreateOverlayComponent,
    MatDialogModule,
  ],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),

      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(-100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class SideNavComponent implements OnInit {
  isChannelListExpanded: boolean = true;
  isMsgListExpanded: boolean = true;
  sideNavIsVisible: boolean = true;
  addChannelOverlayIsVisible$: Observable<boolean>;

  @Input() userChannels: ChannelWithKey[] = [];
  @Input() channel!: ChannelWithKey;

  @Output() channelSelected = new EventEmitter<ChannelWithKey>();

  selectChannel(channel: ChannelWithKey) {
    this.channelSelected.emit(channel);
  }

  ngOnInit() {
    // Lade gespeicherte Zustände aus dem LocalStorage
    const savedChannelState = localStorage.getItem('channelListExpanded');
    const savedMsgState = localStorage.getItem('msgListExpanded');

    this.isChannelListExpanded = savedChannelState
      ? JSON.parse(savedChannelState)
      : true;
    this.isMsgListExpanded = savedMsgState ? JSON.parse(savedMsgState) : true;
  }

  constructor(
    private variableService: VariablesService,
    private dialog: MatDialog
  ) {
    this.addChannelOverlayIsVisible$ =
      this.variableService.addChannelOverlayIsVisible$;

    this.variableService.sideNavIsVisible$.subscribe((value) => {
      this.sideNavIsVisible = value;
    });
  }

  openDialog() {
    this.dialog.open(ChannelCreateOverlayComponent, {
      maxWidth: 'unset',
      panelClass: 'channelCreateOverlayComponent-dialog',
    });
  }

  toggleChannelNav() {
    this.variableService.toggleSideNav();
  }

  toggleChannelList() {
    this.isChannelListExpanded = !this.isChannelListExpanded;
    // Speichere neuen Zustand im LocalStorage
    localStorage.setItem(
      'channelListExpanded',
      JSON.stringify(this.isChannelListExpanded)
    );
  }

  toggleMsgList() {
    this.isMsgListExpanded = !this.isMsgListExpanded;
    // Speichere neuen Zustand im LocalStorage
    localStorage.setItem(
      'msgListExpanded',
      JSON.stringify(this.isMsgListExpanded)
    );
  }

  showAddChannelOverlay() {
    this.variableService.toggleAddChannelOverlay();
  }
}
