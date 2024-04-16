// Import the necessary functions from the Firebase modules
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, query, orderByChild, startAt, endAt, onValue } from 'firebase/database';
import { firebaseConfig } from 'config.js';
firebaseConfig = require('config.js');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Get the search input element
const searchInput = document.getElementById('search-box');

// Add an event listener to the search input
searchInput.addEventListener('input', function() {
  const searchTerm = this.value.trim().toLowerCase();

  if (searchTerm.length > 2) {
    // Reference to your database path
    const recipesRef = query(ref(database, 'recipes'), orderByChild('Title'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
    
    onValue(recipesRef, (snapshot) => {
      const searchResults = [];
      snapshot.forEach((childSnapshot) => {
        searchResults.push(childSnapshot.val());
      });

      // Call function to display the search results
      displaySearchResults(searchResults);
    }, {
      onlyOnce: true
    });
  } else {
    document.getElementById('results').innerHTML = '';
  }
});

// Function to display the search results
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  results.forEach((recipe) => {
    const recipeElement = document.createElement('div');
    recipeElement.classList.add('recipe-box');
    recipeElement.innerHTML = `
      <h3 class="recipe-title">${recipe.Title}</h3>
    `;
    recipeElement.addEventListener('click', function() {
      populateRecipeDetails(recipe);
    });
    resultsContainer.appendChild(recipeElement);
  });
}

// Function to populate recipe details
function populateRecipeDetails(recipe) {
  const detailsContainer = document.getElementById('recipe-details-container');
  const titleElement = document.getElementById('recipe-title');

  titleElement.textContent = recipe.Title;
  detailsContainer.querySelector('.ingredients-card ul').innerHTML = recipe.Ingredients.map((ingredient) => `<li>${ingredient.Name} - ${ingredient.Quantity} ${ingredient.Unit}</li>`).join('');
  detailsContainer.querySelector('.instructions-card ul').innerHTML = recipe['Numbered Instructions'].map((instruction) => `<li>${instruction}</li>`).join('');

  detailsContainer.style.display = 'block';
  toggleBlurAndOverlay(true);
}

// Function to toggle blur and overlay
function toggleBlurAndOverlay(show) {
  const overlay = document.getElementById('darkOverlay');
  const backgroundContent = document.querySelector('.container');
  overlay.style.display = show ? 'block' : 'none';
  backgroundContent.classList.toggle('blur-background', show);
}

// Event listener for closing the recipe details view
window.addEventListener('click', (event) => {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
