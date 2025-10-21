import { Component, OnInit } from '@angular/core';
import { Navigation } from "../navigation/navigation";
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { RouterOutlet } from "@angular/router";
import { Sidebar } from "./sidebar/sidebar";


@Component({
  selector: 'app-suggestions',
  imports: [Navigation, FormsModule, NgFor, NgIf, RouterOutlet, Sidebar],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.scss'
})
export class Suggestions {



}