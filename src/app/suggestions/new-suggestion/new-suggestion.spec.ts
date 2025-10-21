import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewSuggestion } from './new-suggestion';

describe('NewSuggestion', () => {
  let component: NewSuggestion;
  let fixture: ComponentFixture<NewSuggestion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSuggestion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewSuggestion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
