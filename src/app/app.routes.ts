import { Routes } from "@angular/router";
import { Suggestions } from "./suggestions/suggestions";
import { NewSuggestion } from "./suggestions/new-suggestion/new-suggestion";
import { AllSuggestions } from "./suggestions/all-suggestions/all-suggestions";
import { Admin } from "./admin/admin";
import { Login } from "./suggestions/login/login";
import { CreateAccount } from "./suggestions/create-account/create-account";


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'suggestions',
    pathMatch: 'full'
  },
  {
    path: 'suggestions',
    component: Suggestions,
    title: 'OpenVoice Box - Suggestions',
    children: [
      {
        path: '',
        redirectTo: 'all',
        pathMatch: 'full'
      },
      {
        path: 'new',
        component: NewSuggestion,
        title: 'New Suggestion'
      },
      {
        path: 'all',
        component: AllSuggestions,
        title: 'All Suggestions'
      },
      {
        path: 'login',
        component: Login,
        title: 'Login'
      },
      {
        path: 'create-account',
        component: CreateAccount,
        title: 'Create Account'
      }
    ]
  },
  {
    path: 'admin',
    component: Admin,
    title: 'OpenVoice Box - Admin'
  },
  {
    path: '**',
    redirectTo: 'suggestions'
  }
];