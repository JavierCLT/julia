document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeDetailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    const favoriteCheckbox = document.getElementById('favorite-checkbox');
    const darkOverlay = document.getElementById('darkOverlay');
    const container = document.querySelector('.container');
    const errorMessage = document.getElementById('error-message');
    const messageContainer = document.getElementById('message-container');
    const addRecipeButton = addRecipeForm.querySelector('button[type="submit"]');
    const viewFavoritesLink = document.getElementById('view-favorites-link');
    const viewTagsLink = document.getElementById('view-tags-link');
    const viewAllRecipesLink = document.getElementById('view-all-recipes-link');
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

    const showLoadingIndicator = (show) => {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = show ? 'block' : 'none';
    };
    
    const showMessage = (message) => {
        messageContainer.textContent = '';
        messageContainer.textContent = message;
        messageContainer.classList.add('show');
        setTimeout(() => {
            messageContainer.classList.remove('show');
        }, 2000);
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

    const fetchTags = async () => {
        try {
            const response = await fetch('/tags');
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching tags:', error);
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
            console.log('API Response:', data); 

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
            originHtml += data.origin;
            originHtml += '</p>';

            while (recipeTitle.nextSibling) {
                recipeDetailsContainer.removeChild(recipeTitle.nextSibling);
            }

            recipeTitle.insertAdjacentHTML('afterend', ingredientsHtml + instructionsHtml + tagsHtml + servingsHtml + originHtml);
            favoriteCheckbox.checked = data.is_favorite;
            recipeDetailsContainer.style.display = 'block';

            // Append edit and delete buttons
            const recipeButtons = document.createElement('div');
            recipeButtons.id = 'recipe-buttons';
            recipeButtons.innerHTML = `
                <button id="edit-recipe-btn" class="edit-recipe-btn">Edit Recipe</button>
                <button id="delete-recipe-btn" class="delete-recipe-btn">Delete Recipe</button>
            `;
            recipeDetailsContainer.appendChild(recipeButtons);

            document.getElementById('edit-recipe-btn').onclick = () => {
                formJustOpened = true;
                console.log('Edit button clicked for recipe ID:', recipeId);
                const recipeData = {
                    title: data.title,
                    ingredients: data.ingredients.map(ingredient => ingredient.Description).join('\n'),
                    instructions: data.instructions.map(instruction => instruction.Description).join('\n'),
                    tags: data.tags.join(','),
                    servings: data.servings,
                    origin: data.origin
                };
                console.log('Recipe data:', recipeData);
                populateEditForm(recipeId, recipeData);
                setTimeout(() => { formJustOpened = false; }, 100);
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
        console.log('Populating edit form with data:', recipeData); 

        addRecipeFormContainer.style.display = 'block'; 
        addRecipeButton.textContent = 'Save'; 
        console.log('Form container display set to block');
        toggleBlurAndOverlay(true);

        document.getElementById('recipe-title-input').value = recipeData.title || '';
        document.getElementById('recipe-ingredients-input').value = recipeData.ingredients || '';
        document.getElementById('recipe-instructions-input').value = recipeData.instructions || '';
        document.getElementById('recipe-tags-input').value = recipeData.tags || '';
        document.getElementById('recipe-servings-input').value = recipeData.servings || '';
        document.getElementById('recipe-origin-input').value = recipeData.origin || '';

        addRecipeForm.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(addRecipeForm);
            const updatedRecipeData = Object.fromEntries(formData.entries());

            try {
                console.log('Sending update request with data:', updatedRecipeData);
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
                    fetchAndDisplayRecipeDetails(recipeId);
                }
            } catch (error) {
                console.error('Error updating recipe:', error);
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
        addRecipeButton.textContent = 'Add Recipe'; 
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

        formData.set('tags', tags.join(','));

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
    
    favoriteCheckbox.onchange = async () => {
        const recipeId = favoriteCheckbox.getAttribute('data-recipe-id');
        const isFavorite = favoriteCheckbox.checked;
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
                recipeDetailsContainer.style.display = 'none'; // Close the details container
                toggleBlurAndOverlay(false);
            }
        } catch (error) {
            console.error('Error updating favorite status:', error);
        }
    };

    viewFavoritesLink.addEventListener('click', async () => {
        try {
            const response = await fetch('/favorites');
            const favorites = await response.json();
            renderRecipes(favorites);
            searchBox.value = 'Favorites'; // Set the search box text to "Favorites"
        } catch (error) {
            console.error('Error fetching favorite recipes:', error);
        }
    });

    viewTagsLink.addEventListener('click', async () => {
        try {
            const tags = await fetchTags();
            resultsContainer.innerHTML = ''; // Clear the results container
            const tagList = document.createElement('ul');
            tags.forEach(tag => {
                const tagItem = document.createElement('li');
                tagItem.textContent = tag;
                tagItem.className = 'tag-item'; // Add a class for styling
                tagItem.addEventListener('click', () => {
                    searchBox.value = tag;
                    handleSearch({ target: { value: tag } }); // Trigger search
                });
                tagList.appendChild(tagItem);
            });
            resultsContainer.appendChild(tagList);
            searchBox.value = 'Tags'; // Set the search box text to "Tags"
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    });
document.getElementById('view-tags-link').addEventListener('click', async () => {
    try {
        const response = await fetch('/tags');
        const tags = await response.json();

        const tagsContainer = document.createElement('div');
        tagsContainer.id = 'tags-container';
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.textContent = tag.TagName;
            tagElement.addEventListener('click', () => {
                searchBox.value = tag.TagName;
                handleSearch({ target: searchBox });
            });
            tagsContainer.appendChild(tagElement);
        });

        resultsContainer.innerHTML = ''; // Clear existing content
        resultsContainer.appendChild(tagsContainer); // Add the tags container

    } catch (error) {
        console.error('Error fetching tags:', error);
    }
});
    viewAllRecipesLink.addEventListener('click', async () => {
        try {
            const recipes = await fetchRecipes(''); // Fetch all recipes with an empty query
            renderRecipes(recipes);
            searchBox.value = 'All Recipes'; // Set the search box text to "All Recipes"
        } catch (error) {
            console.error('Error fetching all recipes:', error);
        }
    });
});
