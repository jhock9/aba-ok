const dashPanel = document.querySelector('#dash-panel');
const navOpenBtn = document.querySelector('#nav-open-btn');

const adminViews = document.querySelectorAll('.admin-view');
const navLinks = document.querySelectorAll('#dash-nav-list a');
const logoutBtn = document.querySelector('#logout-btn');

const createUserForm = document.querySelector('#user-form');
const createClientForm = document.querySelector('#client-form');
const flashcardsModal = document.querySelector('#flashcards-modal');

let currentUser;

// TODO: Prob need to have JS auto populate all the sections instead of hard coding...

import { fetchAccountData, updatePassword } from './account.js';
import { refreshUsersTable, createUser } from './users.js';
import { refreshClientsTable, createClient } from './clients.js';
import { checkGoogleAuthentication, fetchConfig } from './google.js';
import { togglePasswordVisibility } from '../components/password.js';
import { addModalEventListeners, hideModal, showFlashcardsModal } from '../components/modals.js';

// Show or hide elements based on the user's role
const updateDashNav = async (currentUser) => {
  try {
    if (currentUser.role === 'admin') {
      console.log ('User is admin. Showing admin views...');
      const isAuthenticated = await checkGoogleAuthentication();
      
      if (isAuthenticated === true) {
        document.querySelector('#users-tab').click();
      }
      
      for (let view of adminViews) {
        view.classList.remove('hide');
      }
      } else {
      console.log('User is not admin. Showing user views...');
      document.querySelector('#clients-tab').click();
    }
  } catch (error) {
    console.error('Error updating dashboard navigation:', error);
  }
};

const logout = async () => {
  try {
    console.log('Sending logout request...');
    const response = await fetch('/auth/logout', { method: 'GET', credentials: 'include' });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    console.log('Logout successful.');
    window.location.href = '/';
  } catch (error) {
    console.error('Error during logout:', error);
  }
};


//**   NAV  **//

// Add event listeners to the navigation links
navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    console.log('nav link clicked...'); 
    
    const href = link.getAttribute('href');
    
    // Only handle links that navigate to a section on the current page
    if (href.startsWith('#')) {
      event.preventDefault();
      toggleNav();
      
      // Hide all sections
      const sections = document.querySelectorAll('main section');
      sections.forEach((section) => {
        section.classList.add('hide');
      });
      
      // Remove 'clicked' class from all nav tabs
      navLinks.forEach((link) => {
        link.classList.remove('clicked');
      });
      
      // Add 'clicked' class to clicked nav tab
      link.classList.add('clicked');
      
      // Show the clicked section
      const sectionId = href.slice(1);
      console.log('sectionId:', sectionId);
      const section = document.querySelector(`#${sectionId}`);
      section.classList.remove('hide');
      
      if (sectionId === 'users') {
        console.log('users-tab clicked...');
        refreshUsersTable();
      };
      
      if (sectionId === 'clients') {
        console.log('clients-tab clicked...');
        refreshClientsTable(window.selectedUserId);
        window.selectedUserId = null;
      }
      
      // Show the flashcards modal if not authenticated with Google
      if (sectionId === 'flashcards') {
        checkGoogleAuthentication().then(response => {
          if (!response.isGoogleAuthenticated) {
            showFlashcardsModal();
            setTimeout(hideModal, 3000);
          }
        });
      }
    }
  });
});

//**   WINDOW LOAD EVENTS   **/

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Dashboard window loaded...');
  for (let view of adminViews) {
    view.classList.add('hide');
  }
  
  currentUser = await fetchAccountData();
  updateDashNav(currentUser);
  
  // Update the HTML to display the user's name and username
  document.querySelector('#acct-name').textContent = currentUser.fullname;
  document.querySelector('#acct-username').textContent = currentUser.username;
  
  await fetchConfig();
  
  togglePasswordVisibility();
  addModalEventListeners();
  updatePassword(document.querySelector('#update-password-form'));
  
  // Logout after 12 hours
  setTimeout(logout, 12 * 60 * 60 * 1000);
});

// Closes the flashcards modal if the user clicks outside of it
window.onclick = (event) => {
  if (event.target === flashcardsModal) {
    flashcardsModal.classList.add('hide');
    window.location.href = '/flashcards.html';
  }
};


//**   TOGGLES   **// 

//!! Toggle the navigation menu when in mobile view only
const toggleNav = () => {
  console.log('Toggling nav...');
  navOpenBtn.classList.toggle('open');
  dashPanel.classList.toggle('open');
};


//**   BUTTONS   **//

navOpenBtn.addEventListener('click', async () => {
  console.log('Open button clicked...');
  try {
    toggleNav();
  } catch (error) {
    console.error('Error on open button click:', error);
  }
});

logoutBtn.addEventListener('click', async (e) => {
  console.log('Sign out button clicked...');
  e.preventDefault();
  await logout();
});

// Create and update users
createUserForm.addEventListener('submit', (event) => {
  event.preventDefault();
  createUser(event);
  refreshUsersTable();
});

// Create and update clients
createClientForm.addEventListener('submit', (event) => {
  event.preventDefault();
  createClient(event);
  refreshClientsTable();
});
