import { Component, signal } from '@angular/core';
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

  login() {
    const prnValue = this.prn().trim();
    const passwordValue = this.password().trim();

    if (!prnValue || !passwordValue) {
      this.errorMessage.set('Please fill in both fields.');
      return;
    }

    const expectedPasswordPattern = new RegExp(`^${prnValue}\\d{1,5}$`);

    if (!expectedPasswordPattern.test(passwordValue)) {
      this.errorMessage.set('Password must be your PRN followed by your 4-5 digit Admission Number.');
      return;
    }

    this.errorMessage.set('');
    alert(`Login successful!\nPRN: ${prnValue}`);
    // TODO: Navigate to the dashboard
  }
}
