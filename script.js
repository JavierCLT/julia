// Import the functions you need from the Firebase SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getDatabase, ref, query, orderByChild, startAt, endAt, onValue } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf_ctPJrXjlrUsmxIlZB2fYsrX4DAJ3Hs",
  authDomain: "jhrecipes1.firebaseapp.com",
  databaseURL: "https://jhrecipes1-default-rtdb.firebaseio.com",
  projectId: "jhrecipes1",
  storageBucket: "jhrecipes1.appspot.com",
  messagingSenderId: "319004682120",
  appId: "1:319004682120:web:787f15928e249e6ea43c3d",
  measurementId: "G-W9SJVFNSWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Get the search input element
const searchInput = document.getElementById('search-box');

// Function to filter recipes based on search criteria
function filterRecipes(recipes, searchTerm) {
  return recipes.filter(recipe => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // Search in title
    const matchTitle = recipe.Title && recipe.Title.toLowerCase().includes(lowerCaseSearchTerm);
    // Search in ingredients
    const matchIngredients = recipe.Ingredients && recipe.Ingredients.some(ingredient => ingredient.Name.toLowerCase().includes(lowerCaseSearchTerm));
    // Search in categories
    const matchCategory = recipe.Category && recipe.Category.some(category => category.toLowerCase().includes(lowerCaseSearchTerm));
    // Search in tags
    const matchTags = recipe.Tags && recipe.Tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm));
  
    return matchTitle || matchIngredients || matchCategory || matchTags;
  });
}

// Add an event listener to the search input
searchInput.addEventListener('input', function() {
  const searchTerm = this.value.trim();

  // Check the length of the search term and log it
  console.log(`Search term length: ${searchTerm.length}`);

  if (searchTerm.length > 2) {
    const recipesRef = ref(database, 'recipes');
    onValue(recipesRef, (snapshot) => {
      const recipes = snapshot.val() || [];
      const searchResults = filterRecipes(Object.values(recipes), searchTerm);

      // Log the search results to see what we get
      console.log(`Search results for '${searchTerm}':`, searchResults);

      displaySearchResults(searchResults);
    }, {
      onlyOnce: true
    });
  } else {
    // Update the message when there are less than 3 characters
    document.getElementById('results').innerHTML = '<p>Please enter at least 3 characters to search.</p>';
  }
});

// Function to display the search results
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  results.forEach((recipe) => {
    if (recipe) { // Check if the recipe object is not null
      const recipeElement = document.createElement('div');
      recipeElement.classList.add('recipe-box');
      recipeElement.innerHTML = `<h3 class="recipe-title">${recipe.Title}</h3>`;
      recipeElement.addEventListener('click', function() {
        populateRecipeDetails(recipe);
      });
      resultsContainer.appendChild(recipeElement);
    }
  });

  // If no results are found, display a message
  if (results.length === 0) {
    resultsContainer.innerHTML = '<p>No recipes found.</p>';
  }
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

// Event listener for closing the recipe details view
window.addEventListener('click', (event) => {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
