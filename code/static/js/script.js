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

    const fetchWithAuth = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

    const fetchRecipes = async (query) => {
        try {
            const data = await fetchWithAuth(`/search?query=${encodeURIComponent(query)}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching recipes:', error);
            showMessage('Error fetching recipes. Please try again.');
            return [];
        }
    };

    const fetchTags = async () => {
        try {
            return await fetchWithAuth('/tags');
        } catch (error) {
            console.error('Error fetching tags:', error);
            showMessage('Error fetching tags. Please try again.');
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
            const data = await fetchWithAuth(`/recipe_details/${encodeURIComponent(recipeId)}`);
            console.log('API Response:', data);

            // Ingredients
            const ingredientsList = document.querySelector('.ingredients-list');
            ingredientsList.innerHTML = '';
            data.ingredients.forEach(ingredient => {
                const li = document.createElement('li');
                li.textContent = ingredient.Description;
                ingredientsList.appendChild(li);
            });

            // Instructions
            const instructionsList = document.querySelector('.instructions-list');
            instructionsList.innerHTML = '';
            data.instructions.forEach(instruction => {
                const li = document.createElement('li');
                li.textContent = instruction.Description;
                instructionsList.appendChild(li);
            });

            // Tags, Servings, Origin
            document.querySelector('.tags-list').textContent = data.tags.join(', ');
            document.querySelector('.servings-count').textContent = data.servings;
            document.querySelector('.origin').textContent = data.origin;
            const tagsListElement = document.querySelector('.tags-list');
            tagsListElement.textContent = data.tags.join(', ');

            favoriteCheckbox.checked = data.is_favorite;
            favoriteCheckbox.setAttribute('data-recipe-id', recipeId);

            recipeDetailsContainer.style.display = 'block';
            setTimeout(() => {
                recipeDetailsContainer.scrollTop = 0;
            }, 0);
            
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
                        const data = await fetchWithAuth(`/delete_recipe/${encodeURIComponent(recipeId)}`, {
                            method: 'POST',
                            body: JSON.stringify({ password: password })
                        });
                        showMessage(data.message);
                        if (data.success) {
                            recipeDetailsContainer.style.display = 'none';
                            toggleBlurAndOverlay(false);
                        }
                    } catch (error) {
                        console.error('Error deleting recipe:', error);
                        showMessage('Error deleting recipe. Please try again.');
                    }
                }
            };

            // Share Recipe Button
            const shareButton = document.getElementById('share-recipe-btn');
            shareButton.onclick = () => {
                const shareData = {
                    title: `Check out this recipe: ${data.title}`,
                    text: `Ingredients:\n${data.ingredients.map(i => i.Description).join('\n')}\n\nInstructions:\n${data.instructions.map(i => i.Description).join('\n')}\n\nTags: ${data.tags.join(', ')}\n\nServings: ${data.servings}`,
                    url: window.location.href
                };
                navigator.share(shareData).then(() => {
                    console.log('Recipe shared successfully');
                }).catch((error) => {
                    console.error('Error sharing recipe:', error);
                });
            };

        } catch (error) {
            console.error('Error fetching recipe details:', error);
            showMessage('Error fetching recipe details. Please try again.');
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
                const data = await fetchWithAuth(`/update_recipe/${recipeId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedRecipeData)
                });
                showMessage(data.message);
                if (data.success) {
                    addRecipeForm.reset();
                    addRecipeFormContainer.style.display = 'none';
                    toggleBlurAndOverlay(false);
                    fetchAndDisplayRecipeDetails(recipeId);
                }
            } catch (error) {
                console.error('Error updating recipe:', error);
                showMessage('Error updating recipe. Please try again.');
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
            const data = await fetchWithAuth('/add_recipe', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            showMessage(data.message);
            if (data.success) {
                addRecipeForm.reset();
                addRecipeFormContainer.style.display = 'none';
                toggleBlurAndOverlay(false);
            }
        } catch (error) {
            console.error('Error adding recipe:', error);
            showMessage('Error adding recipe. Please try again.');
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
            await fetchWithAuth(`/update_favorite/${recipeId}`, {
                method: 'POST',
                body: JSON.stringify({ is_favorite: isFavorite })
            });
        } catch (error) {
            console.error('Error updating favorite status:', error);
            favoriteCheckbox.checked = !isFavorite;
            showMessage('Error updating favorite status. Please try again.');
        }
    };

    viewFavoritesLink.addEventListener('click', async () => {
        try {
            const favorites = await fetchWithAuth('/favorites');
            renderRecipes(favorites);
            searchBox.value = 'Favorites';
        } catch (error) {
            console.error('Error fetching favorite recipes:', error);
            showMessage('Error fetching favorites. Please try again.');
        }
    });

    viewTagsLink.addEventListener('click', async () => {
        try {
            const tags = await fetchTags();
            resultsContainer.innerHTML = '';
            const tagListContainer = document.createElement('div');
            tagListContainer.className = 'tags-list-container';
            
            const tagList = document.createElement('ul');
            tags.forEach(tag => {
                const tagItem = document.createElement('li');
                tagItem.textContent = tag;
                tagItem.className = 'tag-item';
                tagItem.addEventListener('click', () => {
                    tagItem.classList.add('clicked');
                    setTimeout(() => {
                        tagItem.classList.remove('clicked');
                    }, 300);

                    searchBox.value = tag;
                    handleSearch({ target: { value: tag } });
                });
                tagList.appendChild(tagItem);
            });
            tagListContainer.appendChild(tagList);
            resultsContainer.appendChild(tagListContainer);
            searchBox.value = 'Tags';
        } catch (error) {
            console.error('Error fetching tags:', error);
            showMessage('Error fetching tags. Please try again.');
        }
    });
    viewAllRecipesLink.addEventListener('click', async () => {
        try {
            const recipes = await fetchRecipes(''); // Fetch all recipes with an empty query
            renderRecipes(recipes);
            searchBox.value = 'All Recipes'; // Set the search box text to "All Recipes"
        } catch (error) {
            console.error('Error fetching all recipes:', error);
            showMessage('Error fetching all recipes. Please try again.');
        }
    });
 /*
    // Function to check if user is authenticated
    const checkAuth = () => {
    const token = localStorage.getItem('token');
    const requiresAuth = ['/recipes', '/profile'].includes(window.location.pathname);
    if (!token && requiresAuth) {
        window.location.href = '/login.html';
    }
};

    // Call checkAuth when the page loads
   
    checkAuth();

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    };

    // Add event listener for logout button if it exists
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Initial load of all recipes
    const loadInitialRecipes = async () => {
        try {
            const recipes = await fetchRecipes('');
            renderRecipes(recipes);
        } catch (error) {
            console.error('Error loading initial recipes:', error);
            showMessage('Error loading recipes. Please try again.');
        }
    };

    // Call loadInitialRecipes when the page loads
    loadInitialRecipes();
    */
});
