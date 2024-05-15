document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim();
    const resultsContainer = document.getElementById('results');
    clearTimeout(this.delay);
    this.delay = setTimeout(() => {
        if (searchQuery.length > 3) {
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
                        recipeElement.setAttribute('data-recipe-id', recipe.RecipeID);
                        recipeElement.innerHTML = `<div class="recipe-content">
                                                      <h3 class="recipe-title">${recipe.Title}</h3>
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

document.getElementById('add-recipe-btn').addEventListener('click', function() {
    document.getElementById('add-recipe-form-container').style.display = 'block';
    toggleBlurAndOverlay(true);
});

document.getElementById('cancel-btn').addEventListener('click', function() {
    document.getElementById('add-recipe-form-container').style.display = 'none';
    toggleBlurAndOverlay(false);
});

document.getElementById('add-recipe-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    fetch('/add_recipe', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            document.getElementById('add-recipe-form').reset();
            document.getElementById('add-recipe-form-container').style.display = 'none';
            toggleBlurAndOverlay(false);
            // Optionally, refresh the search results or add the new recipe to the results dynamically
        }
    })
    .catch(error => console.error('Error:', error));
});

function fetchAndDisplayRecipeDetails(recipeId) {
    // Fetch the details from the server
    fetch(`/recipe_details/${encodeURIComponent(recipeId)}`)
        .then(response => response.json())
        .then(data => {
            // Reference to the container
            const detailsContainer = document.getElementById('recipe-details-container');
            const deleteBtn = document.getElementById('delete-recipe-btn');
            deleteBtn.style.display = 'block'; // Show the delete button

            // Add event listener for delete button
            deleteBtn.onclick = function() {
                const password = prompt("Enter the password to delete the recipe:");
                fetch(`/delete_recipe/${encodeURIComponent(recipeId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password: password })
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) {
                        detailsContainer.style.display = 'none';
                        toggleBlurAndOverlay(false);
                        // Optionally, refresh the search results to remove the deleted recipe
                    }
                })
                .catch(error => console.error('Error:', error));
            };

            // Create HTML for ingredients
            let ingredientsHtml = '<h3>Ingredients:</h3><ul>';
            data.ingredients.forEach(ingredient => {
                ingredientsHtml += `<li>${ingredient.Quantity} ${ingredient.Unit} of ${ingredient.Name}</li>`;
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
    const backgroundContent = document.querySelector('.container');
    if (show) {
        overlay.style.display = 'block';
        backgroundContent.classList.add('blur-background');
    } else {
        overlay.style.display = 'none';
        backgroundContent.classList.remove('blur-background');
    }
}

document.addEventListener('click', function(event) {
    let targetElement = event.target.closest('.recipe-box');
    if (targetElement) {
        const recipeId = targetElement.getAttribute('data-recipe-id');
        if (recipeId) {
            const recipeTitle = targetElement.querySelector('.recipe-title').textContent;
            document.getElementById('recipe-title').textContent = recipeTitle;
            fetchAndDisplayRecipeDetails(recipeId);
            toggleBlurAndOverlay(true);
        }
    }
});

window.addEventListener('click', function(event) {
    const detailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
        detailsContainer.style.display = 'none';
        recipeTitle.textContent = '';
        toggleBlurAndOverlay(false);
    }
});
