document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim();
    const resultsContainer = document.getElementById('results');
    clearTimeout(this.delay);
    this.delay = setTimeout(() => {
        if (searchQuery.length > 3) {
            fetch(`https://foods-cad3aa2b09ba.herokuapp.com/search?query=${encodeURIComponent(searchQuery)}`)
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
                        recipeElement.setAttribute('data-recipe-id', recipe.id); // Set the recipe ID here
                        recipeElement.innerHTML = `<div class="recipe-content">
                                                      <h3 class="recipe-title">${recipe.title}</h3>
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
function fetchAndDisplayRecipeDetails(id) {
    // Fetch the details from the server
    fetch(`/recipe_details/${encodeURIComponent(id)}`)
        .then(response => response.json())
        .then(data => {
            // Reference to the container
            const detailsContainer = document.getElementById('recipe-details-container');
            // Create HTML for ingredients
            let ingredientsHtml = '<h3>Ingredients:</h3><ul>';
            data.ingredients.forEach(ingredient => {
                let quantity = ingredient.Quantity;
                let unit = ingredient.Unit;
                let name = ingredient.Name;
            
                // Check if quantity is empty and capitalize the first letter of the ingredient's name
                if (quantity === "") {
                    name = name.charAt(0).toUpperCase() + name.slice(1);
                    ingredientsHtml += `<li>${name}</li>`; // No quantity or unit, and 'of' is omitted
                } else {
                    // Check if quantity is text and should be capitalized
                    if (isNaN(quantity)) {
                        quantity = quantity.charAt(0).toUpperCase() + quantity.slice(1);
                    }
                    ingredientsHtml += `<li>${quantity} ${unit} of ${name}</li>`;
                }
            });
            ingredientsHtml += '</ul>';

            // Create HTML for instructions
            let instructionsHtml = '<h3>Instructions:</h3><ul>';
            data.instructions.forEach(instruction => {
                instructionsHtml += `<li>${instruction.Description}</li>`;
            });
            instructionsHtml += '</ul>';

            // Empty the container without removing the title
            let titleElement = document.getElementById('recipe-title');
            while (titleElement.nextSibling) {
                detailsContainer.removeChild(titleElement.nextSibling);
            }

            // Insert the ingredients and instructions HTML after the title
            document.getElementById('recipe-title').insertAdjacentHTML('afterend', ingredientsHtml + instructionsHtml);

            // Show the container
            detailsContainer.style.display = 'block';

            console.log(data);
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
        const id = targetElement.getAttribute('data-recipe-id');
        if (id) {
            // Retrieve the title from the clicked element and update the yellow area
            const recipeTitle = targetElement.querySelector('.recipe-title').textContent;
            document.getElementById('recipe-title').textContent = recipeTitle;
            
            // Fetch and display recipe details
            fetchAndDisplayRecipeDetails(id);

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

