document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeDetailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    const darkOverlay = document.getElementById('darkOverlay');
    const container = document.querySelector('.container');
    const errorMessage = document.getElementById('error-message');
    const messageContainer = document.getElementById('message-container');
    const addRecipeButton = addRecipeForm.querySelector('button[type="submit"]');
    let formJustOpened = false;

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
    };

    const showMessage = (message) => {
        messageContainer.textContent = ''; // Clear any existing message
        messageContainer.textContent = message;
        messageContainer.classList.add('show');
        setTimeout(() => {
            messageContainer.classList.remove('show');
        }, 2000); // Message will disappear after 2 seconds
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
                formJustOpened = true;
                console.log('Edit button clicked for recipe ID:', recipeId);
                const recipeData = {
                    title: data.title,
                    ingredients: data.ingredients.map(ingredient => ingredient.Description).join('\n'),
                    instructions: data.instructions.map(instruction => instruction.Description).join('\n'),
                    tags: data.tags.join(','),
                    servings: data.servings,
                    origin: data.origin,
                    is_favorite: data.is_favorite // Assuming the response includes this field
                };
                console.log('Recipe data:', recipeData); // Log the data
                populateEditForm(recipeId, recipeData);
                setTimeout(() => { formJustOpened = false; }, 100); // Allow some time before enabling the close logic again
            };

            document.getElementById('delete-recipe-btn').onclick = async () => {
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
                        showMessage(data.message);
                        if (data.success) {
                            recipeDetailsContainer.style.display = 'none';
                            toggleBlurAndOverlay(false);
                        }
                    } catch (error) {
                        console.error('Error deleting recipe:', error);
                    }
                }
            };

        } catch (error) {
            console.error('Error fetching recipe details:', error);
        }
    };

    const populateEditForm = (recipeId, recipeData) => {
        console.log('Populating edit form with data:', recipeData); // Log the data

        // Show the add recipe form container
        addRecipeFormContainer.style.display = 'block'; // Ensure display is set to block
        addRecipeButton.textContent = 'Save'; // Change the button text to "Save"
        console.log('Form container display set to block'); // Log to confirm form display change
        toggleBlurAndOverlay(true);

        // Populate the form with recipe data
        document.getElementById('recipe-title-input').value = recipeData.title || '';
        document.getElementById('recipe-ingredients-input').value = recipeData.ingredients || '';
        document.getElementById('recipe-instructions-input').value = recipeData.instructions || '';
        document.getElementById('recipe-tags-input').value = recipeData.tags || '';
        document.getElementById('recipe-servings-input').value = recipeData.servings || '';
        document.getElementById('recipe-origin-input').value = recipeData.origin || '';
        document.getElementById('recipe-favorite-input').checked = recipeData.is_favorite || false;

        // Change the form submit handler to update the recipe
        addRecipeForm.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(addRecipeForm);
            const updatedRecipeData = Object.fromEntries(formData.entries()); // Ensure we get all the form data

            try {
                console.log('Sending update request with data:', updatedRecipeData); // Log the request data
                const response = await fetch(`/update_recipe/${recipeId}`, {
                    method: 'POST',
                    body: JSON.stringify(updatedRecipeData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                showMessage(data.message);
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

        // Add event listener for the favorite checkbox
        document.getElementById('recipe-favorite-input').onchange = async (event) => {
            const isFavorite = event.target.checked;
            try {
                const response = await fetch(`/update_favorite/${recipeId}`, {
                    method: 'POST',
                    body: JSON.stringify({ is_favorite: isFavorite }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                showMessage(data.message);
                if (data.success) {
                    addRecipeFormContainer.style.display = 'none';
                    toggleBlurAndOverlay(false);
                    // Refresh the recipe details
                    fetchAndDisplayRecipeDetails(recipeId);
                }
            } catch (error) {
                console.error('Error updating favorite status:', error);
            }
        };
    };

    const checkDuplicateTags = (tags) => {
        const tagSet = new Set(tags);
        return tagSet.size !== tags.length;
    };

    searchBox.addEventListener('input', handleSearch);

    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'block';
        addRecipeButton.textContent = 'Add Recipe'; // Change the button text to "Add Recipe"
        toggleBlurAndOverlay(true);
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
    });

    addRecipeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addRecipeForm);
        const tags = formData.get('tags').split(',').map(tag => tag.trim());
        const formDataObject = Object.fromEntries(formData.entries());
        formDataObject.is_favorite = formDataObject.is_favorite ? true : false;

        if (checkDuplicateTags(tags)) {
            errorMessage.textContent = 'Duplicate tags are not allowed.';
            errorMessage.style.display = 'block';
            return;
        } else {
            errorMessage.style.display = 'none';
        }

        formData.set('tags', tags.join(',')); // Ensure tags are properly formatted

        try {
            const response = await fetch('/add_recipe', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData.entries())),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            showMessage(data.message);
            if (data.success) {
                addRecipeForm.reset();
                addRecipeFormContainer.style.display = 'none';
                toggleBlurAndOverlay(false);
            }
        } catch (error) {
            console.error('Error adding recipe:', error);
        }
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
        console.log('Window click event:', event.target);
        if (!recipeDetailsContainer.contains(event.target) && recipeDetailsContainer.style.display === 'block') {
            recipeDetailsContainer.style.display = 'none';
            recipeTitle.textContent = '';
            toggleBlurAndOverlay(false);
        }
        if (!formJustOpened && !addRecipeFormContainer.contains(event.target) && addRecipeFormContainer.style.display === 'block' && !event.target.closest('#add-recipe-btn')) {
            addRecipeFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
        }
    });

    document.getElementById('view-favorites-link').addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            const response = await fetch('/favorites');
            const favorites = await response.json();
            // Render favorite recipes
            renderRecipes(favorites);
        } catch (error) {
            console.error('Error fetching favorite recipes:', error);
        }
    });
});
