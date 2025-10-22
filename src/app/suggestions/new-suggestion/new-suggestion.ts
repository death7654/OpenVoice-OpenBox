import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

import { AuthService, UserState } from '../../core/account-state';
import { Subscription } from 'rxjs'; 


interface Comment {
  user_id: string;
  text: string;
  timestamp: string;
}

interface Suggestion {
  id: string;
  user_id: string;
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
  comments: Comment[];
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}

// --- COMPONENT ---

@Component({
  selector: 'app-new-suggestion',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, NgIf],
  templateUrl: './new-suggestion.html',
  styleUrl: './new-suggestion.scss'
})
export class NewSuggestion implements OnInit, OnDestroy { 
  
  // State properties
  private authSubscription!: Subscription;
  isLoggedIn = false;
  // NEW: Store the user's ID here from the subscription
  currentUserId: string | null = null; 
  submissionMessage = ''; 
  
  // Form properties
  title = '';
  description = '';
  preview = false;
  tagInput = '';
  parsedTags: string[] = [];
  selectedCategory = '';
  fontSize = 14; 
  @Input() id: string | null = null; // This is probably unused/misused now

  categories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other'
  ];

  // FIX: Use constructor injection instead of field inject() to ensure AuthService is resolved.
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Subscription now works because 'authService' is defined via the constructor
    this.authSubscription = this.authService.userState$.subscribe((state: UserState) => {
      this.isLoggedIn = state.isLoggedIn;
      // Store the user ID received from the service
      this.currentUserId = state.accountId; 
      
      if (!this.isLoggedIn) {
        this.submissionMessage = 'You must be logged in to submit a new suggestion.';
      } else if (this.submissionMessage.startsWith('You must be logged in')) {
        // Clear message if user logs in after seeing the warning
        this.submissionMessage = ''; 
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // --- Tag and Formatting Methods (Unchanged) ---
  
  addTag(event: Event): void {
    const input = event.target as HTMLInputElement;
    const key = (event as KeyboardEvent).key;

    if (key !== 'Enter' && key !== ' ') {
      return;
    }
    
    event.preventDefault(); 

    const trimmedTag = input.value.trim();

    if (trimmedTag && !this.parsedTags.includes(trimmedTag)) {
      this.parsedTags.push(trimmedTag);
    }
    
    this.tagInput = '';
  }

  removeTag(index: number) {
    this.parsedTags.splice(index, 1);
  }


  formatMarkdown(tag: 'bold' | 'italic') {
    const textarea = document.activeElement as HTMLTextAreaElement;

    if (!textarea || textarea.tagName.toLowerCase() !== 'textarea') {
      const wrapper = tag === 'bold' ? '**' : '*';
      this.description += `${wrapper}text${wrapper}`;
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.description.substring(start, end);
    const wrapper = tag === 'bold' ? '**' : '*';
    const formattedText = `${wrapper}${selectedText}${wrapper}`;

    this.description =
      this.description.substring(0, start) +
      formattedText +
      this.description.substring(end);

    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + wrapper.length + (selectedText.length > 0 ? selectedText.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  sizeUp() {
    this.fontSize += 2;
  }

  sizeDown() {
    if (this.fontSize > 6) this.fontSize -= 2;
  }

  // --- Submission Logic (Updated) ---

  submit() {
    this.submissionMessage = ''; 

    // CRITICAL GUARD: Check login status and ensure we have the user ID
    if (!this.isLoggedIn || !this.currentUserId) {
      this.submissionMessage = '🚫 You must be logged in to submit a suggestion.';
      console.warn('Submission blocked: User not logged in or ID missing.');
      return;
    }

    if (!this.title || !this.description || !this.selectedCategory) {
      this.submissionMessage = '⚠️ Please fill all required fields (Title, Description, Category)!';
      return;
    }

    const suggestion: Suggestion = {
      id: crypto.randomUUID(),
      // FIX: Use the securely obtained currentUserId
      user_id: this.currentUserId, 
      title: this.title,
      description: this.description,
      summary: this.getsummary(),
      tags: this.parsedTags,
      category: this.selectedCategory,
      
      upvotes: 0,
      downvotes: 0,
      solved: false,
      status: 'Pending',
      priority: 'Undefined', 
      comments: [],
      comment_count: 0,
      attachments: [],
      is_public: true,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null
    };

    const stored = localStorage.getItem('suggestions');
    const suggestions: Suggestion[] = stored ? JSON.parse(stored) : []; 
    suggestions.push(suggestion);
    localStorage.setItem('suggestions', JSON.stringify(suggestions));

    this.resetForm();
    this.submissionMessage = '✅ Suggestion successfully submitted!';
    
    setTimeout(() => this.submissionMessage = '', 5000);
  }

  getsummary()
  {
    return this.description.substring(0, 100).trim() + '...';
  }

  resetForm() {
    this.title = '';
    this.description = '';
    this.parsedTags = [];
    this.tagInput = '';
    this.preview = false;
    this.selectedCategory = '';
    this.fontSize = 14;
  }
}