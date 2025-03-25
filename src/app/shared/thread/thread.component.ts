import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
  animations: [
    trigger('slideInOut', [
      // Einblenden (die Komponente schiebt sich von rechts in den Bildschirm)
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }), // Startzustand (unsichtbar und rechts außerhalb)
        animate('500ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })) // Endzustand (sichtbar)
      ]),
      // Ausblenden (die Komponente schiebt sich nach rechts aus dem Bildschirm)
      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }), // Startzustand (sichtbar)
        animate('500ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 })) // Endzustand (unsichtbar und nach rechts)
      ])
    ])
  ]
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
