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

  taggedContacts: {name: string; img: string;}[] = [];

  filteredContacts : {name: string; img: string}[] = [];

  ngOnInit() {

this.taggedContacts = this.variableService.getTaggedContactsFromChat();

this.updateFilteredContacts();
console.log(this.taggedContacts);

    this.variableService.nameToFilter$.subscribe((value) => {
      this.nametoFilter = value;
     


      if(this.nametoFilter === ''){
        this.closeDiaglog();
        return;
      }

      if(this.nametoFilter === '@'){
       this.updateFilteredContacts();
        return;
      }

      const filterText = this.nametoFilter.includes('@')
        ? this.nametoFilter.split('@').pop()?.trim() || ''
        : this.nametoFilter.trim();


        this.filteredContacts = this.filteredContacts.filter(contact => contact.name.toLowerCase().includes(filterText.toLowerCase()));
    });
  }

  closeDiaglog(){this.dialogRef.close();}


  addContactToChat(contact: any){

    const nameToRemove = this.filteredContacts.findIndex((c) => c.name === contact.name);
    
    
    if(nameToRemove !== -1){
      
      const removedContact = this.filteredContacts.splice(nameToRemove, 1)[0];
      this.taggedContacts.push(removedContact);
      this.variableService.setTaggedContactsFromChat(this.taggedContacts);
      this.updateFilteredContacts();
      

    }

  }

  updateFilteredContacts() {
    this.filteredContacts = this.allContacts.filter(
      (contact) => !this.taggedContacts.some((tagged) => tagged.name === contact.name)
    );
  }
}
