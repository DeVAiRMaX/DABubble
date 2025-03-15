import { Component } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';


@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [HeaderComponent, SideNavComponent, ChannelChatComponent, ThreadComponent],
  templateUrl: './main-component.component.html',
  styleUrl: './main-component.component.scss'
})
export class MainComponentComponent {

}
