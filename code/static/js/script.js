// script.js
import {firebaseConfig} from './config.js';

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get the search input element
const searchInput = document.getElementById('search-box');

// Function to display the search results
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  results.forEach(recipe => {
    const recipeElement = document.createElement('div');
    recipeElement.classList.add('recipe-box');
    recipeElement.innerHTML = `
      <h3 class="recipe-title">${recipe.Title}</h3>
    `;
    // Add event listener for displaying recipe details
    recipeElement.addEventListener('click', () => {
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
  detailsContainer.querySelector('.ingredients-card ul').innerHTML = recipe.Ingredients.map(ingredient => `<li>${ingredient.Name} - ${ingredient.Quantity} ${ingredient.Unit}</li>`).join('');
  detailsContainer.querySelector('.instructions-card ul').innerHTML = recipe['Numbered Instructions'].map(instruction => `<li>${instruction}</li>`).join('');

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

// Add an event listener to the search input
searchInput.addEventListener('input', function() {
  const searchTerm = this.value.trim().toLowerCase();
  
  clearTimeout(this.delay);
  this.delay = setTimeout(() => {
    if (searchTerm.length > 2) {
      // Fetch and filter recipes from Firebase
      database.ref('/recipes').once('value').then(snapshot => {
        const recipes = snapshot.val() ? Object.values(snapshot.val()) : [];
        const filteredRecipes = recipes.filter(recipe => {
          return recipe.Title.toLowerCase().includes(searchTerm) ||
                 recipe.Ingredients.some(ing => ing.Name.toLowerCase().includes(searchTerm)) ||
                 recipe.Tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                 recipe.Category.some(cat => cat.toLowerCase().includes(searchTerm));
        });
        displaySearchResults(filteredRecipes);
      });
    } else {
      document.getElementById('results').innerHTML = '';
    }
  }, 300);
});

// Event listener for closing the recipe details view
window.addEventListener('click', function(event) {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
