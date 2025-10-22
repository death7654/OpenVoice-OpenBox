import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-sidebar',
  imports: [NgFor, RouterLink, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
   menuItems = [
    { label: 'New Suggestion', path: '/suggestions/new', icon: 'bi-plus-circle-fill' },
    { label: 'All Suggestions', path: '/suggestions/all', icon: 'bi-list-ul' },
    { label: 'Account', path: '/suggestions/account', icon: 'bi-person-circle' }
  ];

}
