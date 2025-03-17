import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';


@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

  isClosed: boolean = false;
  constructor(private variableService: VariablesService){

    this.variableService.threadIsClosed$.subscribe(value =>{
      this.isClosed = value;
    })
  }


  toggleThread(){
    this.variableService.toggleThread();
  }

 

}
