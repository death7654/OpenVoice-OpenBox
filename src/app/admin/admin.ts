import { Component, OnInit, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navigation } from "../navigation/navigation"; 

declare var bootstrap: any;

interface Suggestion {
  id: string;
  title: string;
  description: string;
  tags: string[];
  solved: boolean;
  category: string;
  upvotes: number;
  downvotes: number;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
  resolved_at: string;
  comments: string[];
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}

const DEFAULT_USERNAME = 'superuser';
const DEFAULT_PASSWORD = 'adminpass123';

@Component({
  selector: 'app-admin',
  standalone: true, 
  imports: [CommonModule, FormsModule, Navigation], 
  templateUrl: './admin.html',
  styleUrls: [],
})
export class Admin implements OnInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  categories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other'
  ];

  isLoggedIn = signal(true);
  usernameInput = signal('');
  passwordInput = signal('');
  loginError = signal('');
  isBrowser = false;

  suggestions: Suggestion[] = [];
  filterText = signal('');

  // Filtered suggestions based on search term
  filteredSuggestions = computed(() => {
    const term = this.filterText().toLowerCase().trim();
    if (!term) return this.suggestions;
    return this.suggestions.filter(
      s =>
        s.title.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term) ||
        s.tags.some(t => t.toLowerCase().includes(term))
    );
  });

  // Only public suggestions for grid display
  publicSuggestions = computed(() => this.filteredSuggestions().filter(s => s.is_public));

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) this.loadSuggestions();
  }

  editingSuggestion: Suggestion | null = null;
  tagsInput = '';
  attachmentsInput = '';

  login(): void {
    if (this.usernameInput() === DEFAULT_USERNAME && this.passwordInput() === DEFAULT_PASSWORD) {
      this.isLoggedIn.set(true);
      this.loginError.set('');
      this.usernameInput.set('');
      this.passwordInput.set('');
    } else {
      this.loginError.set('Invalid username or password.');
    }
  }

  logout(): void {
    this.isLoggedIn.set(false);
  }

  private loadSuggestions(): void {
    const stored = localStorage.getItem('suggestions');
    this.suggestions = stored ? JSON.parse(stored) : [];
  }

  private saveToStorage(): void {
    localStorage.setItem('suggestions', JSON.stringify(this.suggestions));
  }

  openEditor(suggestion: Suggestion): void {
    this.editingSuggestion = JSON.parse(JSON.stringify(suggestion));
    this.tagsInput = suggestion.tags.join(', ');
    this.attachmentsInput = suggestion.attachments.join(',');

    setTimeout(() => {
      const modalElement = document.getElementById('editModal');
      if (modalElement) {
        new bootstrap.Modal(modalElement).show();
      }
    }, 0);
  }

  saveChanges(): void {
    if (!this.editingSuggestion) return;

    this.editingSuggestion.tags = this.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    this.editingSuggestion.attachments = this.attachmentsInput.split(',').map(a => a.trim()).filter(Boolean);
    this.editingSuggestion.updated_at = new Date().toISOString();

    const isTerminal = ['Solved', 'Closed'].includes(this.editingSuggestion.status);
    this.editingSuggestion.solved = isTerminal;
    if (isTerminal && !this.editingSuggestion.resolved_at) {
      this.editingSuggestion.resolved_at = new Date().toISOString();
    } else if (!isTerminal) {
      this.editingSuggestion.resolved_at = '';
    }

    const index = this.suggestions.findIndex(s => s.id === this.editingSuggestion!.id);
    if (index !== -1) this.suggestions[index] = this.editingSuggestion;

    this.saveToStorage();

    const modalElement = document.getElementById('editModal');
    if (modalElement) bootstrap.Modal.getInstance(modalElement)?.hide();

    alert('✅ Suggestion updated successfully!');
  }

  deleteSuggestion(s: Suggestion): void {
    if (confirm(`Delete suggestion "${s.title}"?`)) {
      this.suggestions = this.suggestions.filter(x => x.id !== s.id);
      this.saveToStorage();
    }
  }

  saveAll(): void {
    this.suggestions.forEach(s => {
      s.updated_at = new Date().toISOString();
      const isTerminal = ['Solved', 'Closed'].includes(s.status);
      s.solved = isTerminal;
      if (isTerminal && !s.resolved_at) s.resolved_at = new Date().toISOString();
      else if (!isTerminal) s.resolved_at = '';
    });
    this.saveToStorage();
    alert('✅ All changes saved successfully!');
  }
}
