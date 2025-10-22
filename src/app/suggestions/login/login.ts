import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  prn = signal('');
  password = signal('');
  errorMessage = signal('');
  id: string | null = null;
  @Output() idEmitter = new EventEmitter<string>();

  login() {
    const prnValue = this.prn().trim().toUpperCase();
    const passwordValue = this.password().trim();

    if (!prnValue || !passwordValue) {
      this.errorMessage.set('Please fill in both fields.');
      return;
    }

    this.errorMessage.set('');
    alert(`Login successful!\nPRN: ${prnValue}`);

    
    // TODO: Navigate to the dashboard
  }

  sendIdToParent() {
    if(this.id != null)
    {
      this.idEmitter.emit(this.id);
    }
  }
}
