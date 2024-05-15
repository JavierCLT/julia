document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim();
    const resultsContainer = document.getElementById('results');
    clearTimeout(this.delay);
    this.delay = setTimeout(() => {
        if (searchQuery.length > 2) {
            fetch(`/search?query=${encodeURIComponent(searchQuery)}`)
                .then(response => response.json())
                .then(data => {
                    resultsContainer.innerHTML = '';
                    if (!Array.isArray(data)) {
                        console.error('Received data is not an array:', data);
                        return;
                    }
                    let grid = document.createElement('div');
                    grid.className = 'grid';
                    data.forEach(recipe => {
                        const recipeElement = document.createElement('div');
                        recipeElement.className = 'recipe-box';
                        recipeElement.setAttribute('data-recipe-id', recipe.RecipeID); // Set the recipe ID here
                        recipeElement.innerHTML = `<div class="recipe-content">
                                                      <h3 class="recipe-title">${recipe.Title}</h3>
                                                      <!-- Other recipe info can go here -->
                                                   </div>`;
                        grid.appendChild(recipeElement);
                    });
                    resultsContainer.appendChild(grid);
                })
                .catch(error => console.error('Error:', error));
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 100);
});

// JavaScript function to fetch and display recipe details
function fetchAndDisplayRecipeDetails(recipeId) {
    const startTime = performance.now();

    fetch(`/recipe_details/${encodeURIComponent(recipeId)}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            let contentHtml = '<h3>Ingredients:</h3><ul>';
            data.ingredients.forEach(ingredient => {
                contentHtml += `<li>${ingredient.Quantity} ${ingredient.Unit} of ${ingredient.Name}</li>`;
            });
            contentHtml += '</ul>';

            contentHtml += '<h3>Instructions:</h3><ul>';
            data.instructions.forEach(instruction => {
                contentHtml += `<li>${instruction.Description}</li>`;
            });
            contentHtml += '</ul>';

            let titleElement = document.getElementById('recipe-title');
            while (titleElement.nextSibling) {
                detailsContainer.removeChild(titleElement.nextSibling);
            }

            document.getElementById('recipe-title').insertAdjacentHTML('afterend', contentHtml);
            detailsContainer.style.display = 'block';

            const endTime = performance.now();
            console.log(`Fetch and display took ${endTime - startTime} milliseconds`);
        })
        .catch(error => {
            console.error('Error fetching recipe details:', error);
        });
}


function toggleBlurAndOverlay(show) {
    const overlay = document.getElementById('darkOverlay');
    const backgroundContent = document.querySelector('.container'); // This should be the container of your background content.
    if (show) {
        overlay.style.display = 'block';
        backgroundContent.classList.add('blur-background');
    } else {
        overlay.style.display = 'none';
        backgroundContent.classList.remove('blur-background');
    }
}


// Event delegation to handle clicks on recipe titles
document.addEventListener('click', function(event) {
    let targetElement = event.target.closest('.recipe-box');
    
    // Check if a recipe-box was clicked
    if (targetElement) {
        const recipeId = targetElement.getAttribute('data-recipe-id');
        if (recipeId) {
            // Retrieve the title from the clicked element and update the yellow area
            const recipeTitle = targetElement.querySelector('.recipe-title').textContent;
            document.getElementById('recipe-title').textContent = recipeTitle;
            
            // Fetch and display recipe details
            fetchAndDisplayRecipeDetails(recipeId);

            // Call this function when a recipe is clicked to show the details and the overlay
            toggleBlurAndOverlay(true);
        }
    }
});

// JavaScript to close the recipe details view when clicking outside
window.addEventListener('click', function(event) {
    const detailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    // Check if the click is outside the recipe details and if the details container is currently shown
    if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
        detailsContainer.style.display = 'none';
        recipeTitle.textContent = ''; // Clear the title when the details view is closed
        toggleBlurAndOverlay(false);
    }
});

