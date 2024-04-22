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

// Ensure the DOM is fully loaded before querying for elements
document.addEventListener('DOMContentLoaded', function() {
  // Get the search input element
  const searchInput = document.getElementById('search-box');

  // Add an event listener to the search input
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim().toLowerCase();

if (searchTerm.length > 2) {
  const recipesRef = ref(database, 'recipes');
onValue(recipesRef, (snapshot) => {
  const recipesObject = snapshot.val();
  
  // Check if the recipesObject is not null or undefined
  if (recipesObject) {
    const recipesArray = Object.values(recipesObject);
    const searchResults = [];

    // Iterate through the array-like object of recipes
    recipesArray.forEach(recipe => {
      if (doesRecipeMatchSearchTerm(recipe, searchTerm)) {
        searchResults.push(recipe);
      }
    });

    displaySearchResults(searchResults);
  } else {
    // Handle the case where no data exists at the reference
    console.log('No recipes found at the reference:', recipesRef);
    document.getElementById('results').innerHTML = '<p>No recipes found.</p>';
  }
}, {
  onlyOnce: true
});
} else {
  document.getElementById('results').innerHTML = '<p>Please enter at least 3 characters to search.</p>';
}

  // Function to filter recipes based on search criteria
  function doesRecipeMatchSearchTerm(recipe, searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Check if the Title matches the search term
    if (recipe.Title && recipe.Title.toLowerCase().includes(lowerCaseSearchTerm)) {
      return true;
    }

    // Check if any Ingredient matches the search term
    if (recipe.Ingredients && recipe.Ingredients.some(ingredient => 
      ingredient.Name.toLowerCase().includes(lowerCaseSearchTerm))) {
      return true;
    }

    // Check if any Category matches the search term
    if (recipe.Category && recipe.Category.includes(lowerCaseSearchTerm)) {
      return true;
    }

    // Check if any Tag matches the search term
    if (recipe.Tags && recipe.Tags.includes(lowerCaseSearchTerm)) {
      return true;
    }

    return false; // No match found
  }

  // Function to display the search results
  function displaySearchResults(searchResults) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    searchResults.forEach(recipe => {
      const recipeElement = document.createElement('div');
      recipeElement.classList.add('recipe-box');
      recipeElement.innerHTML = `<h3 class="recipe-title">${recipe.Title}</h3>`;
      // ... Add click event listener or any additional logic here
      resultsContainer.appendChild(recipeElement);
    });

    if (searchResults.length === 0) {
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

});
