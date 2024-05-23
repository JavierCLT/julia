document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeDetailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    const darkOverlay = document.getElementById('darkOverlay');
    const container = document.querySelector('.container');
    const errorMessage = document.getElementById('error-message');

    let currentRecipeId = null;  // Store the current recipe ID being edited

    const debounce = (func, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const toggleBlurAndOverlay = (show) => {
        if (show) {
            darkOverlay.style.display = 'block';
            container.classList.add('blur-background');
        } else {
            darkOverlay.style.display = 'none';
            container.classList.remove('blur-background');
        }
        console.log('Toggle blur and overlay:', show); // Log to confirm the function call
    };

    const fetchRecipes = async (query) => {
        try {
            const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching recipes:', error);
            return [];
        }
    };

    const renderRecipes = (recipes) => {
        resultsContainer.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'grid';
        recipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.className = 'recipe-box';
            recipeElement.setAttribute('data-recipe-id', recipe.RecipeID);
            recipeElement.innerHTML = `<div class="recipe-content">
                                          <h3 class="recipe-title">${recipe.Title}</h3>
                                       </div>`;
            grid.appendChild(recipeElement);
        });
        resultsContainer.appendChild(grid);
    };

    const handleSearch = debounce(async (event) => {
        const searchQuery = event.target.value.trim();
        if (searchQuery.length > 2) {
            const recipes = await fetchRecipes(searchQuery);
            renderRecipes(recipes);
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 300);

    const fetchAndDisplayRecipeDetails = async (recipeId) => {
        try {
            const response = await fetch(`/recipe_details/${encodeURIComponent(recipeId)}`);
            const data = await response.json();
            console.log('API Response:', data); // Log the API response

        let ingredientsHtml = '<h3>Ingredients:</h3><ul>';
        data.ingredients.forEach(ingredient => {
            ingredientsHtml += `<li>${ingredient.Description}</li>`;
        });
        ingredientsHtml += '</ul>';

        let instructionsHtml = '<h3>Instructions:</h3><ul>';
        data.instructions.forEach(instruction => {
            instructionsHtml += `<li>${instruction.Description}</li>`;
        });
        instructionsHtml += '</ul>';

        let tagsHtml = '<h3>Tags:</h3><p>';
        tagsHtml += data.tags.join(', ');
        tagsHtml += '</p>';

        let servingsHtml = '<h3>Servings:</h3><p>';
        servingsHtml += data.servings;
        servingsHtml += '</p>';

        let originHtml = '<h3>Origin:</h3><p>';
        originHtml += data.origin; // Assuming 'origin' is the field name in the data
        originHtml += '</p>';

        while (recipeTitle.nextSibling) {
            recipeDetailsContainer.removeChild(recipeTitle.nextSibling);
        }

        recipeTitle.insertAdjacentHTML('afterend', ingredientsHtml + instructionsHtml + tagsHtml + servingsHtml + originHtml);
        recipeDetailsContainer.style.display = 'block';

        // Append edit and delete buttons
        const recipeButtons = document.createElement('div');
        recipeButtons.id = 'recipe-buttons';
        recipeButtons.innerHTML = `
            <button id="edit-recipe-btn" class="edit-recipe-btn">Edit Recipe</button>
            <button id="delete-recipe-btn" class="delete-recipe-btn">Delete Recipe</button>
        `;
        recipeDetailsContainer.appendChild(recipeButtons);

        // Add event listeners to the buttons
      document.getElementById('edit-recipe-btn').onclick = () => {
                console.log('Edit button clicked for recipe ID:', recipeId);
                const recipeData = {
                    title: data.Title,
                    ingredients: data.ingredients.map(ingredient => ingredient.Description).join('\n'),
                    instructions: data.instructions.map(instruction => instruction.Description).join('\n'),
                    tags: data.tags.join(','),
                    servings: data.servings,
                    origin: data.origin
                };
                console.log('Recipe data:', recipeData); // Log the data
                populateEditForm(recipeId, recipeData);
            };

        document.getElementById('delete-recipe-btn').addEventListener('click', async () => {
            const password = prompt("Enter password to delete this recipe:");
            if (password) {
                try {
                    const response = await fetch(`/delete_recipe/${encodeURIComponent(recipeId)}`, {
                        method: 'POST',
                        body: JSON.stringify({ password: password }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    alert(data.message);
                    if (data.success) {
                        recipeDetailsContainer.style.display = 'none';
                        toggleBlurAndOverlay(false);
                    }
                } catch (error) {
                    console.error('Error deleting recipe:', error);
                }
            }
        });

    } catch (error) {
        console.error('Error fetching recipe details:', error);
    }
};

   const populateEditForm = (recipeId, recipeData) => {
        console.log('Populating edit form with data:', recipeData); // Log the data

        // Show the add recipe form container
        addRecipeFormContainer.style.display = 'block'; // Ensure display is set to block
        console.log('Form container display set to block'); // Log to confirm form display change
        toggleBlurAndOverlay(true);

        // Populate the form with recipe data
        document.getElementById('recipe-title-input').value = recipeData.title || '';
        document.getElementById('recipe-ingredients-input').value = recipeData.ingredients || '';
        document.getElementById('recipe-instructions-input').value = recipeData.instructions || '';
        document.getElementById('recipe-tags-input').value = recipeData.tags || '';
        document.getElementById('recipe-servings-input').value = recipeData.servings || '';
        document.getElementById('recipe-origin-input').value = recipeData.origin || '';

        // Change the form submit handler to update the recipe
        addRecipeForm.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(addRecipeForm);
            const updatedRecipeData = Object.fromEntries(formData);

            try {
                const response = await fetch(`/update_recipe/${recipeId}`, {
                    method: 'POST',
                    body: JSON.stringify(updatedRecipeData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                alert(data.message);
                if (data.success) {
                    addRecipeForm.reset();
                    addRecipeFormContainer.style.display = 'none';
                    toggleBlurAndOverlay(false);
                    // Refresh the recipe details
                    fetchAndDisplayRecipeDetails(recipeId);
                }
            } catch (error) {
                console.error('Error updating recipe:', error);
            }
        };
    };
    
    searchBox.addEventListener('input', handleSearch);

    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        // Clear the form for adding a new recipe
        addRecipeForm.reset();
        currentRecipeId = null; // Reset the current recipe ID

        // Show the add recipe form container
        addRecipeFormContainer.style.display = 'block';
        toggleBlurAndOverlay(true);

        // Update the form title and button text for adding
        document.querySelector('#add-recipe-form-container h2').textContent = 'Add New Recipe';
        document.querySelector('#add-recipe-form button[type="submit"]').textContent = 'Add Recipe';
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
        currentRecipeId = null; // Reset the current recipe ID
    });

    document.addEventListener('click', (event) => {
        const targetElement = event.target.closest('.recipe-box');
        if (targetElement) {
            const recipeId = targetElement.getAttribute('data-recipe-id');
            if (recipeId) {
                const recipeTitleText = targetElement.querySelector('.recipe-title').textContent;
                recipeTitle.textContent = recipeTitleText;
                fetchAndDisplayRecipeDetails(recipeId);
                toggleBlurAndOverlay(true);
            }
        }
    });

    window.addEventListener('click', (event) => {
        if (!recipeDetailsContainer.contains(event.target) && recipeDetailsContainer.style.display === 'block') {
            recipeDetailsContainer.style.display = 'none';
            recipeTitle.textContent = '';
            toggleBlurAndOverlay(false);
        }
        if (!addRecipeFormContainer.contains(event.target) && addRecipeFormContainer.style.display === 'block' && !event.target.closest('#add-recipe-btn')) {
            addRecipeFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
            currentRecipeId = null; // Reset the current recipe ID
        }
    });
});
