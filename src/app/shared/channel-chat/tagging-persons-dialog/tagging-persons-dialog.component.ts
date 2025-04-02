import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { VariablesService } from '../../../variables.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-tagging-persons-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tagging-persons-dialog.component.html',
  styleUrl: './tagging-persons-dialog.component.scss'
})
export class TaggingPersonsDialogComponent implements OnInit {
  nametoFilter : string = '';

  constructor(private variableService: VariablesService, private dialogRef: MatDialogRef<TaggingPersonsDialogComponent>) {}

  allContacts = [
    { name: 'Frederik Beck (Du)', img: '/assets/img/character/3.png' },
    { name: 'Sofia Müller', img: '/assets/img/character/2.png' },
    { name: 'Noah Braun', img: '/assets/img/character/1.png' },
    { name: 'Elise Roth', img: '/assets/img/character/4.png' },
    { name: 'Elias Neumann', img: '/assets/img/character/5.png' },
    { name: 'Steffen Hoffmann', img: '/assets/img/character/6.png' }
  ];

  filteredContacts = [...this.allContacts];

  ngOnInit() {
    this.variableService.nameToFilter$.subscribe((value) => {
     
      this.nametoFilter = value;
     


      if(this.nametoFilter === ''){
        this.closeDiaglog();
        return;
      }

      if(this.nametoFilter === '@'){
        this.filteredContacts = [...this.allContacts];
        return;
      }

      const filterText = this.nametoFilter.includes('@')
        ? this.nametoFilter.split('@').pop()?.trim() || ''
        : this.nametoFilter.trim();


        this.filteredContacts = this.allContacts.filter(contact => contact.name.toLowerCase().includes(filterText.toLowerCase()));

      // Falls filterText nicht leer ist, wird gefiltert
      // if (filterText) {
      //   this.filteredContacts = this.allContacts.filter(contact =>
      //     contact.name.toLowerCase().includes(filterText.toLowerCase())
      //   );
      // } else {
      //   this.filteredContacts = [...this.allContacts]; // Zeigt alle Kontakte an, wenn das Feld leer ist
       
      // }
    });
  }

  closeDiaglog(){
    this.dialogRef.close();
  }
}
