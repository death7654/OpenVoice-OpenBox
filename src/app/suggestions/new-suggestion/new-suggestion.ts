import { Component, Inject } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MarkdownModule, MarkdownComponent } from 'ngx-markdown';

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

  categories = ['UI/UX', 'Performance', 'Feature', 'Bug', 'Other'];

  addTag(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const tag = this.tagInput.trim();
      if (tag && !this.parsedTags.includes(tag)) {
        this.parsedTags.push(tag);
      }
      this.tagInput = '';
    }
  }

  removeTag(index: number) {
    this.parsedTags.splice(index, 1);
  }

  formatMarkdown(tag: 'bold' | 'italic') {
    if (!this.description) this.description = '';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    let formatted = text;
    if (tag === 'bold') formatted = `**${text}**`;
    if (tag === 'italic') formatted = `*${text}*`;
    range.deleteContents();
    range.insertNode(document.createTextNode(formatted));
  }

  sizeUp() {
    this.fontSize += 2;
  }

  sizeDown() {
    if (this.fontSize > 6) this.fontSize -= 2;
  }

  submit() {
    if (!this.title || !this.description || !this.selectedCategory) return alert('Please fill all required fields!');

    const suggestion = {
      id: crypto.randomUUID(),
      title: this.title,
      description: this.description,
      tags: this.parsedTags,
      category: this.selectedCategory,
      created_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      solved: false,
      status: 'Pending',
      priority: 'Medium',
      comments: [],
      comment_count: 0,
      attachments: [],
      is_public: true,
      updated_at: new Date().toISOString(),
      resolved_at: null
    };

    // Save to localStorage
    const stored = localStorage.getItem('suggestions');
    const suggestions = stored ? JSON.parse(stored) : [];
    suggestions.push(suggestion);
    localStorage.setItem('suggestions', JSON.stringify(suggestions));

    this.resetForm();
    alert('✅ Suggestion submitted!');
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
