import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

// Define the Suggestion interface for type safety (CRITICAL FIX)
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


@Component({
  selector: 'app-new-suggestion',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule],
  templateUrl: './new-suggestion.html',
  styleUrl: './new-suggestion.scss'
})
export class NewSuggestion {
  title = '';
  description = '';
  preview = false;
  tagInput = '';
  parsedTags: string[] = [];
  selectedCategory = '';
  fontSize = 14; // default font size
  @Input() id: string | null = null;

  categories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other'
  ];

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

  submit() {
    if (!this.title || !this.description || !this.selectedCategory) return alert('Please fill all required fields!');

    const suggestion: Suggestion = { // <-- Type assertion added here
      id: crypto.randomUUID(),
      title: this.title,
      description: this.description,
      summary: this.getsummary(),
      tags: this.parsedTags,
      category: this.selectedCategory,
      
      // Initial state fields
      upvotes: 0,
      downvotes: 0,
      solved: false,
      status: 'Pending',
      priority: 'Undefined', // Best to default to 'Medium' or 'Low' if not set in UI
      comments: [],
      comment_count: 0,
      attachments: [],
      is_public: true,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null
    };

    // Save to localStorage
    const stored = localStorage.getItem('suggestions');
    // Ensure suggestions is correctly typed as Suggestion[]
    const suggestions: Suggestion[] = stored ? JSON.parse(stored) : []; 
    suggestions.push(suggestion);
    localStorage.setItem('suggestions', JSON.stringify(suggestions));

    this.resetForm();
    alert('✅ Suggestion submitted!');
  }

  getsummary()
  {
    return 'hi';
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