import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TaggingPersonsDialogComponent } from '../channel-chat/tagging-persons-dialog/tagging-persons-dialog.component';


@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule,
      MatDialogModule],
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
  private dialog: MatDialog = inject(MatDialog);
  isClosed: boolean = false;
  lastInputValue: string = '';
  constructor(private variableService: VariablesService){

    this.variableService.threadIsClosed$.subscribe(value =>{
      this.isClosed = value;
    })
  }


  toggleThread(){
    this.variableService.toggleThread();
  }

 openTagPeopleDialog() {
    const targetElement = document.querySelector('.threadwrapper');
    const inputfield = document.querySelector('.textForThreadInput') as HTMLInputElement;
    const inputValue = inputfield?.value || '';

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(TaggingPersonsDialogComponent, {
        position: { bottom: `${rect.top - 20 + window.scrollY}px` ,
         left: `${rect.left + 20 + window.scrollX}px`},
        panelClass: ['tagging-dialog'], 
        backdropClass: 'transparentBackdrop',
        autoFocus: false,
       
       
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();

          dialogElement.style.position = 'absolute';
          dialogElement.style.width = '350px';

          dialogElement.style.borderBottomLeftRadius = '0px';
        }
      }, 10);
      setTimeout(() => {
        const inputField = document.querySelector('.textForThreadInput') as HTMLElement;
        if(inputField){
          inputField.focus();
          
        }
      }, 400);
    }
   
  }

  checkForMention(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.value.includes('@') && !this.lastInputValue.includes('@')) {
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value; // Speichert den aktuellen Wert des gesamten Inputfelds
   this.variableService.setNameToFilter(this.lastInputValue);
  }

  openTaggingPerClick(event: Event){
    const inputElement = event.target as HTMLInputElement;
    if(inputElement){
      inputElement.value = '@';
      this.openTagPeopleDialog();
    }
    this.lastInputValue = inputElement.value;
    this.variableService.setNameToFilter(this.lastInputValue);
  }
  

 

}

