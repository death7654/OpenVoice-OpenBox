import { Routes } from "@angular/router";
import { Suggestions } from "./suggestions/suggestions";
import { NewSuggestion } from "./suggestions/new-suggestion/new-suggestion";
import { AllSuggestions } from "./suggestions/all-suggestions/all-suggestions";
import { Admin } from "./admin/admin";

// Assuming Login and Profile are now available for routing
import { Login } from "./suggestions/account/login/login";
import { Profile } from "./suggestions/account/profile/profile";
import { CreateAccount } from "./suggestions/create-account/create-account";
import { Account } from "./suggestions/account/account";

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
        path: 'all',
        component: AllSuggestions,
        title: 'All Suggestions'
      },
      {
        path: 'new',
        component: NewSuggestion,
        title: 'New Suggestion'
      },
      {
            // Path: /suggestions/account/create-account
            path: 'create-account',
            component: CreateAccount,
            title: 'Create Account'
      },
      {
        path: 'account',
        component: Account,
        title: 'OpenVoice Box - Account',
        children: [
          {
            // Path: /suggestions/account (default)
            path: '',
            redirectTo: 'login',
            pathMatch: 'full'
          },
          {
            // Path: /suggestions/account/login
            path: 'login',
            component: Login,
            title: 'Login',
          },
          {
            // Path: /suggestions/account/profile
            path: 'profile',
            component: Profile,
            title: 'Profile'
          }
        ]
      },
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
