import { Component, OnInit, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navigation } from "../navigation/navigation"; 

declare var bootstrap: any;


interface Suggestion {
  id: string;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  solved: boolean;
  category: string;
  upvotes: number;
  downvotes: number;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
  resolved_at: string | null;
  comments: string[];
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}

type SortColumn = 'title' | 'category' | 'priority' | 'status' | 'is_public' | 'upvotes' | 'created_at';
type SortDirection = 'asc' | 'desc';

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

  isLoggedIn = signal(true);
  usernameInput = signal('');
  passwordInput = signal('');
  loginError = signal('');
  isBrowser = false;
  
  suggestions: Suggestion[] = [];
  filterText = signal(''); 

  // --- Sorting State ---
  sortColumn = signal<SortColumn>('created_at'); 
  sortDirection = signal<SortDirection>('desc');

  // --- Predefined Categories for the dropdown ---
  categories = ['User Interface', 'Feature', 'Bug', 'Website', 'Performance', 'Other'];

  // This is used for cloning the current suggestion when viewing comments
  editingSuggestion: Suggestion | null = null; 

  // --- Combined Filtered and Sorted List ---
  sortedSuggestions = computed(() => {
    const term = this.filterText().toLowerCase().trim();
    const column = this.sortColumn();
    const direction = this.sortDirection();

    // 1. Filtering
    let filtered = this.suggestions;
    if (term) {
      filtered = this.suggestions.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term) ||
          s.tags.some((t) => t.toLowerCase().includes(term))
      );
    }
    
    // 2. Sorting
    // Use .slice() to create a shallow copy before sorting to maintain immutability
    return filtered.slice().sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];

      if (typeof valueA === 'number' || typeof valueA === 'boolean') {
        valueA = Number(valueA);
        valueB = Number(valueB);
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }

      return direction === 'desc' ? comparison * -1 : comparison;
    });
  });

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Bootstrap Icons CSS must be loaded for the icons to appear.
    if (this.isBrowser) {
        // Since we cannot rely on external script loading in the head, we rely on the @import in styles.
        this.loadSuggestions();
    }
  }

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

  sortSuggestions(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      const defaultDir: SortDirection = (column === 'upvotes' || column === 'created_at') ? 'desc' : 'asc';
      this.sortDirection.set(defaultDir);
    }
  }

  saveAll(): void {
    this.suggestions.forEach(s => {
      // Sync solved status and resolved_at on Status change
      const isTerminalStatus = ['Solved', 'Closed'].includes(s.status);
      s.solved = isTerminalStatus;
      if (isTerminalStatus && !s.resolved_at) {
        s.resolved_at = new Date().toISOString().substring(0, 16); 
      } else if (!isTerminalStatus) {
        s.resolved_at = ''; 
      }
      s.updated_at = new Date().toISOString();
      s.comment_count = s.comments.length; // Update count after any potential comment deletion
    });
    this.saveToStorage();
    console.log('💾 All inline changes saved successfully!');
  }
  
  // --- New Methods for Comments ---

  openCommentsModal(suggestion: Suggestion): void {
    // Set the currently edited suggestion for the modal
    this.editingSuggestion = suggestion; 
    
    // Use setTimeout to ensure the modal element exists before trying to initialize/show it
    if (this.isBrowser) {
        setTimeout(() => {
            const modalElement = document.getElementById('commentsModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 0);
    }
  }

  deleteComment(index: number): void {
    if (!this.editingSuggestion) return;

    // Use a custom confirmation logic instead of alert/confirm
    console.warn(`Attempting to delete comment at index ${index} from suggestion: ${this.editingSuggestion.title}`);
    
    // In a real app, this would be a UI modal confirmation. 
    // For this demonstration, we delete directly.
    this.editingSuggestion.comments.splice(index, 1);
    this.editingSuggestion.comment_count = this.editingSuggestion.comments.length;

    // Persist changes to storage and update the main suggestion array
    const originalIndex = this.suggestions.findIndex(s => s.id === this.editingSuggestion!.id);
    if (originalIndex !== -1) {
        // Update the main array reference to trigger re-render if necessary
        this.suggestions[originalIndex].comments = this.editingSuggestion.comments;
        this.suggestions[originalIndex].comment_count = this.editingSuggestion.comments.length;
    }

    this.saveToStorage();
    console.log(`🗑️ Comment deleted successfully.`);
  }

  // --- Persistence and Dummy Data ---

  private loadSuggestions(): void {
    const stored = localStorage.getItem('suggestions');
    if (stored) {
      this.suggestions = JSON.parse(stored);
    } 
  }

  private saveToStorage(): void {
    localStorage.setItem('suggestions', JSON.stringify(this.suggestions));
  }

  deleteSuggestion(s: Suggestion): void {
    console.warn(`Attempting to delete suggestion "${s.title}"...`);
    this.suggestions = this.suggestions.filter((x) => x.id !== s.id);
    this.saveToStorage();
    console.log(`🗑️ Suggestion "${s.title}" deleted.`);
  }
}
