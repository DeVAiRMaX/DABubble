import { Component } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../variables.service';


@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [HeaderComponent, SideNavComponent, ChannelChatComponent, ThreadComponent, CommonModule],
  templateUrl: './main-component.component.html',
  styleUrl: './main-component.component.scss'
})
export class MainComponentComponent {
 sideNavIsVisible:boolean = true;
 threadIsVisible: boolean = true;
  constructor(private variableService: VariablesService){

    this.variableService.sideNavIsVisible$.subscribe(value =>{
      this.sideNavIsVisible = value;
    })

    this.variableService.threadIsClosed$.subscribe(value =>{
      this.threadIsVisible = value;
    })
  }

  toggleSideNav(){
    this.variableService.toggleSideNav();
  }

  toggleThread(){
    this.variableService.toggleThread();
  }
  

}
