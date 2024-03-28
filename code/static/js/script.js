// script.js

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database
const database = firebase.database();

// Get the search input element
const searchInput = document.getElementById('search-box');

// Add an event listener to the search input
searchInput.addEventListener('input', function() {
  const searchTerm = this.value.trim().toLowerCase();

  // Query the Firebase database for matching recipes
  const recipesRef = database.ref('recipes');
  recipesRef.orderByChild('title').startAt(searchTerm).endAt(searchTerm + '\uf8ff').on('value', function(snapshot) {
    const searchResults = [];
    snapshot.forEach(function(childSnapshot) {
      searchResults.push(childSnapshot.val());
    });

    // Display the search results on the page
    displaySearchResults(searchResults);
  });
});

// Function to display the search results
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  results.forEach(recipe => {
    const recipeElement = document.createElement('div');
    recipeElement.classList.add('recipe-box');
    recipeElement.innerHTML = `
      <h3 class="recipe-title" data-id="${recipe.id}">${recipe.title}</h3>
    `;
    recipeElement.addEventListener('click', function() {
      const recipeId = this.querySelector('.recipe-title').getAttribute('data-id');
      fetchAndDisplayRecipeDetails(recipeId);
    });
    resultsContainer.appendChild(recipeElement);
  });
}

// Function to fetch and display recipe details
function fetchAndDisplayRecipeDetails(recipeId) {
  const recipeRef = database.ref(`recipes/${recipeId}`);
  recipeRef.once('value', function(snapshot) {
    const recipe = snapshot.val();
    const detailsContainer = document.getElementById('recipe-details-container');
    const titleElement = document.getElementById('recipe-title');

    titleElement.textContent = recipe.title;
    detailsContainer.querySelector('.ingredients-card ul').innerHTML = recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('');
    detailsContainer.querySelector('.instructions-card ul').innerHTML = recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('');

    detailsContainer.style.display = 'block';
    toggleBlurAndOverlay(true);
  });
}

// Function to toggle blur and overlay
function toggleBlurAndOverlay(show) {
  const overlay = document.getElementById('darkOverlay');
  const backgroundContent = document.querySelector('.container');
  if (show) {
    overlay.style.display = 'block';
    backgroundContent.classList.add('blur-background');
  } else {
    overlay.style.display = 'none';
    backgroundContent.classList.remove('blur-background');
  }
}

// Close recipe details when clicking outside the container
window.addEventListener('click', function(event) {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
