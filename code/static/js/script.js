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

// Reference to the search box and results container
const searchInput = document.getElementById('search-box');
const resultsContainer = document.getElementById('results');
let searchDelay;

// Function to display search results
function displaySearchResults(results) {
  resultsContainer.innerHTML = '';
  results.forEach((recipe) => {
    const recipeElement = document.createElement('div');
    recipeElement.className = 'recipe-box';
    recipeElement.innerHTML = `<h3 class="recipe-title">${recipe.Title}</h3>`;
    recipeElement.addEventListener('click', () => {
      populateRecipeDetails(recipe);
    });
    resultsContainer.appendChild(recipeElement);
  });
}

// Function to populate recipe details
function populateRecipeDetails(recipe) {
  const detailsContainer = document.getElementById('recipe-details-container');
  document.getElementById('recipe-title').textContent = recipe.Title;
  const ingredientsList = detailsContainer.querySelector('.ingredients-card ul');
  ingredientsList.innerHTML = recipe.Ingredients.map(ingredient => `<li>${ingredient.Name} - ${ingredient.Quantity} ${ingredient.Unit}</li>`).join('');
  const instructionsList = detailsContainer.querySelector('.instructions-card ul');
  instructionsList.innerHTML = recipe['Numbered Instructions'].map(instruction => `<li>${instruction}</li>`).join('');
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
searchInput.addEventListener('input', () => {
  const searchTerm = searchInput.value.trim().toLowerCase();
  clearTimeout(searchDelay);
  searchDelay = setTimeout(() => {
    if (searchTerm.length > 2) {
      const recipesRef = query(ref(database, 'recipes'), orderByChild('Title'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
      onValue(recipesRef, (snapshot) => {
        const searchResults = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            searchResults.push(childSnapshot.val());
          });
          displaySearchResults(searchResults);
        } else {
          resultsContainer.innerHTML = 'No results found.';
        }
      }, {
        onlyOnce: true
      });
    } else {
      resultsContainer.innerHTML = '';
    }
  }, 300);  // Adjust delay as needed
});

// Event listener for closing the recipe details view
window.addEventListener('click', (event) => {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
