document.getElementById('add-recipe-button').addEventListener('click', function() {
    document.getElementById('add-recipe-form').style.display = 'block';
});

document.getElementById('cancel-button').addEventListener('click', function() {
    document.getElementById('add-recipe-form').style.display = 'none';
});

document.getElementById('recipe-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const title = document.getElementById('title').value;
    const ingredients = document.getElementById('ingredients').value;
    const instructions = document.getElementById('instructions').value;

    fetch('/add_recipe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title,
            ingredients: ingredients,
            instructions: instructions
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Recipe added successfully!');
            document.getElementById('add-recipe-form').style.display = 'none';
            // Optionally, clear the form fields
            document.getElementById('recipe-form').reset();
        } else {
            alert('Error adding recipe');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

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
                        recipeElement.setAttribute('data-recipe-id', recipe.RecipeID); // Set the recipe ID here
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

function fetchAndDisplayRecipeDetails(recipeId) {
    fetch(`/recipe_details/${encodeURIComponent(recipeId)}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            let ingredientsHtml = '<h3>Ingredients:</h3><ul>';
            data.ingredients.forEach(ingredient => {
                ingredientsHtml += `<li>${ingredient.Quantity} ${ingredient.Unit} of ${ingredient.Name}</li>`;
            });
            ingredientsHtml += '</ul>';

            let instructionsHtml = '<h3>Instructions:</h3><ul>';
            data.instructions.forEach(instruction => {
                instructionsHtml += `<li>${instruction.Description}</li>`;
            });
            instructionsHtml += '</ul>';

            let titleElement = document.getElementById('recipe-title');
            while (titleElement.nextSibling) {
                detailsContainer.removeChild(titleElement.nextSibling);
            }

            document.getElementById('recipe-title').insertAdjacentHTML('afterend', ingredientsHtml + instructionsHtml);

            detailsContainer.style.display = 'block';
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
