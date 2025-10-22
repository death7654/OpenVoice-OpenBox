import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { from, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class Gemini {
  private ai: GoogleGenAI;
  private model = 'gemini-2.5-flash';
  private api_key = environment.firebaseConfig.geminiApiKey;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: this.api_key,
    });
  }

  generateSummary(textToSummarize: string): Observable<string> {
    const prompt = `Please act as a professional summarizer. 
    Read the following text and provide a concise, engaging summary. 
    Ensure the summary is a tidy paragraph in plain text. Remove all emojis, and keep it simple.
    
    --- TEXT TO SUMMARIZE ---
    ${textToSummarize}`;

    return from(
      this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      })
    ).pipe(
      map((response) => {
        if (response.text === undefined) {
          throw new Error(
            'Gemini API did not return text. Content may have been blocked or the input was invalid.'
          );
        }
        return response.text;
      })
    );
  }
}
