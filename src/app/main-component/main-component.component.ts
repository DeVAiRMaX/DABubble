import { Component } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';

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
          animate('200ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })) 
        ]),
       
        transition(':leave', [
          style({ transform: 'translateX(0)', opacity: 1 }), 
          animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 })) 
        ])
      ])
    ]
})
export class MainComponentComponent {
  sideNavIsVisible: boolean = true;
  threadIsVisible: boolean = true;
  constructor(private variableService: VariablesService) {
    this.variableService.sideNavIsVisible$.subscribe((value) => {
      this.sideNavIsVisible = value;
    });

    this.variableService.threadIsClosed$.subscribe((value) => {
      this.threadIsVisible = value;
    });
  }

  toggleSideNav() {
    this.variableService.toggleSideNav();
  }

  toggleThread() {
    this.variableService.toggleThread();
  }
}
