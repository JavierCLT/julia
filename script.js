// Assuming firebaseConfig is defined in your config.js and Firebase is correctly initialized in your project
import { firebaseConfig } from './config.js';
firebase.initializeApp(firebaseConfig);

document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('results');
    clearTimeout(this.delay);
    this.delay = setTimeout(() => {
        if (searchQuery.length > 2) {
            firebase.database().ref('/recipes').once('value').then(snapshot => {
                const firebaseData = snapshot.val() ? Object.values(snapshot.val()) : [];

                const filteredResults = firebaseData.filter(recipe => {
                    const recipeDataString = JSON.stringify(Object.values(recipe)).toLowerCase();
                    return recipeDataString.includes(searchQuery);
                });

                displaySearchResults(filteredResults, resultsContainer);
            });
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 300);
});

function displaySearchResults(results, resultsContainer) {
    resultsContainer.innerHTML = '';
    let grid = document.createElement('div');
    grid.className = 'grid';
    results.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.className = 'recipe-box';
        recipeElement.innerHTML = `<div class="recipe-content">
                                      <h3 class="recipe-title">${recipe.Title}</h3>
                                      <!-- Other recipe info can go here -->
                                   </div>`;
        // Assuming recipe.Title uniquely identifies your recipes, adjust as necessary
        recipeElement.addEventListener('click', () => {
            const detailsContainer = document.getElementById('recipe-details-container');
            // This assumes you have a function or logic to populate the recipe details based on the clicked recipe
            populateRecipeDetails(recipe, detailsContainer);
            toggleBlurAndOverlay(true);
        });
        grid.appendChild(recipeElement);
    });
    resultsContainer.appendChild(grid);
}

// This function should populate the recipe details in your details container
// Modify this function based on how you want to display the details
function populateRecipeDetails(recipe, detailsContainer) {
    // Example of setting the title
    const titleElement = document.getElementById('recipe-title');
    titleElement.textContent = recipe.Title;

    // You'll need to add logic here to populate ingredients, instructions, etc.
}

function toggleBlurAndOverlay(show) {
  const overlay = document.getElementById('darkOverlay');
  const backgroundContent = document.querySelector('.container');
  overlay.style.display = show ? 'block' : 'none';
  backgroundContent.classList.toggle('blur-background', show);
}

// Event listener to close the recipe details view when clicking outside
window.addEventListener('click', function(event) {
  const detailsContainer = document.getElementById('recipe-details-container');
  if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    toggleBlurAndOverlay(false);
  }
});
