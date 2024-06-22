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
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginModal = document.getElementById('login-modal');
    const closeButton = loginModal.querySelector('.close');
    const emailAuthForm = document.getElementById('email-auth-form');
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
                if (confirm("Are you sure you want to delete this recipe?")) {
                    try {
                        const response = await fetch(`/delete_recipe/${encodeURIComponent(recipeId)}`, {
                            method: 'POST',
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
        }
    };

    const populateEditForm = (recipeId, recipeData) => {
        addRecipeFormContainer.style.display = 'block';
        addRecipeButton.textContent = 'Save';
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
            const tags = updatedRecipeData.tags.split(',').map(tag => tag.trim());
            updatedRecipeData.tags = tags;

            try {
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

    const showMessage = (message) => {
        messageContainer.textContent = '';
        messageContainer.textContent = message;
        messageContainer.classList.add('show');
        setTimeout(() => {
            messageContainer.classList.remove('show');
        }, 2000);
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
            await fetch(`/update_favorite/${recipeId}`, {
                method: 'POST',
                body: JSON.stringify({ is_favorite: isFavorite }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error updating favorite status:', error);
            favoriteCheckbox.checked = !isFavorite;
        }
    };

    viewFavoritesLink.addEventListener('click', async () => {
        try {
            const response = await fetch('/favorites');
            const favorites = await response.json();
            renderRecipes(favorites);
            searchBox.value = 'Favorites';
        } catch (error) {
            console.error('Error fetching favorite recipes:', error);
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
        }
    });

    viewAllRecipesLink.addEventListener('click', async () => {
        try {
            const recipes = await fetchRecipes('');
            renderRecipes(recipes);
            searchBox.value = 'All Recipes';
        } catch (error) {
            console.error('Error fetching all recipes:', error);
        }
    });

    loginButton.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
window.addEventListener('click', (event) => {
    if (event.target == loginModal) {
            loginModal.style.display = 'none';
        }
    });

emailAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, remember: rememberMe }),
            });

            const data = await response.json();
            if (data.success) {
                loginModal.style.display = 'none';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                document.getElementById('add-recipe-btn').style.display = 'block';
                showMessage(`Welcome, ${data.name}!`);
            } else {
                showMessage(data.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('An error occurred during login. Please try again.');
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/logout');
            const data = await response.json();
            if (data.success) {
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                document.getElementById('add-recipe-btn').style.display = 'none';
                showMessage('You have been logged out.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            showMessage('An error occurred during logout. Please try again.');
        }
    });

    function handleCredentialResponse(response) {
        fetch('/google_login/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_token: response.credential })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                document.getElementById('add-recipe-btn').style.display = 'block';
                showMessage(`Welcome, ${data.name}!`);
            } else {
                showMessage('Login failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Google login error:', error);
            showMessage('An error occurred during Google login. Please try again.');
        });
    }

    // Load the Google Sign-In API
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Check login status on page load
    fetch('/check_login')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                document.getElementById('add-recipe-btn').style.display = 'block';
            } else {
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                document.getElementById('add-recipe-btn').style.display = 'none';
            }
        })
        .catch(error => console.error('Error checking login status:', error));
});
