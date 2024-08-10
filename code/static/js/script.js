// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf_ctPJrXjlrUsmxIlZB2fYsrX4DAJ3Hs",
  authDomain: "jhrecipes1.firebaseapp.com",
  databaseURL: "https://jhrecipes1-default-rtdb.firebaseio.com",
  projectId: "jhrecipes1",
  storageBucket: "jhrecipes1.appspot.com",
  messagingSenderId: "319004682120",
  appId: "1:319004682120:web:787f15928e249e6ea43c3d",
  measurementId: "G-W9SJVFNSWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const formTitle = document.getElementById('form-title'); // Form title element
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
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    let currentUser = null;
    let formJustOpened = false;
    let isUpdateMode = false;
    let currentRecipeId = null;
    let lastQuery = ''; // Variable to store the last search query

    // Authentication state observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userDisplay.textContent = `Logged in as: ${user.email}`;
            showAuthenticatedUI();
        } else {
            currentUser = null;
            userDisplay.textContent = 'Not logged in';
            showUnauthenticatedUI();
        }
    });

    // Show/hide UI elements based on authentication state
    const showAuthenticatedUI = () => {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        document.getElementById('add-recipe-btn').style.display = 'inline-block';
    };

    const showUnauthenticatedUI = () => {
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        document.getElementById('add-recipe-btn').style.display = 'none';
    };

    // Login button click handler
    loginBtn.addEventListener('click', () => {
        loginFormContainer.style.display = 'block';
        signupFormContainer.style.display = 'none';
        toggleBlurAndOverlay(true);
    });

    // Signup button click handler
    signupBtn.addEventListener('click', () => {
        signupFormContainer.style.display = 'block';
        loginFormContainer.style.display = 'none';
        toggleBlurAndOverlay(true);
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#login-email').value;
        const password = loginForm.querySelector('#login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('Logged in successfully');
            loginFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
        } catch (error) {
            showMessage('Login failed: ' + error.message);
        }
    });

    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = signupForm.querySelector('#signup-email').value;
        const password = signupForm.querySelector('#signup-password').value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Signed up successfully');
            signupFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
        } catch (error) {
            showMessage('Signup failed: ' + error.message);
        }
    });

    // Logout button
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessage('Logged out successfully');
        } catch (error) {
            showMessage('Logout failed: ' + error.message);
        }
    });

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
            const uid = currentUser ? currentUser.uid : '';
            const response = await fetch(`/search?query=${encodeURIComponent(query)}&uid=${uid}`);
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
        const recipeIds = new Set();
        const grid = document.createElement('div');
        grid.className = 'grid';
        recipes.forEach(recipe => {
            if (!recipeIds.has(recipe.RecipeID)) {
                recipeIds.add(recipe.RecipeID);
                const recipeElement = document.createElement('div');
                recipeElement.className = 'recipe-box';
                recipeElement.setAttribute('data-recipe-id', recipe.RecipeID);
                recipeElement.innerHTML = `<div class="recipe-content">
                                              <h3 class="recipe-title">${recipe.Title}</h3>
                                           </div>`;
                grid.appendChild(recipeElement);
            }
        });
        resultsContainer.appendChild(grid);
    };

    const handleSearch = debounce(async (event) => {
        const searchQuery = event.target.value.trim();
        lastQuery = searchQuery; // Store the last query
        if (searchQuery.length > 2) {
            const recipes = await fetchRecipes(searchQuery);
            renderRecipes(recipes);
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 300);

    const fetchAndDisplayRecipeDetails = async (recipeId) => {
        try {
            const uid = currentUser ? currentUser.uid : '';
            const response = await fetch(`/recipe_details/${encodeURIComponent(recipeId)}?uid=${uid}`);
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
            const tagsListElement = document.querySelector('.tags-list');
            tagsListElement.textContent = data.tags.join(', ');

            favoriteCheckbox.checked = data.is_favorite;
            favoriteCheckbox.setAttribute('data-recipe-id', recipeId); // Set recipe ID on the checkbox

            recipeDetailsContainer.style.display = 'block';
            // Scroll to the top of the container
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
                            // Refresh the view to remove the deleted recipe
                            const recipes = await fetchRecipes(searchBox.value.trim());
                            renderRecipes(recipes);
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

        document.getElementById('edit-recipe-btn').style.display = data.is_owner ? 'inline-block' : 'none';
            document.getElementById('delete-recipe-btn').style.display = data.is_owner ? 'inline-block' : 'none';

        } catch (error) {
            console.error('Error fetching recipe details:', error);
        }
    };

    const populateEditForm = (recipeId, recipeData) => {
        console.log('Populating edit form with data:', recipeData); 

        isUpdateMode = true;
        currentRecipeId = recipeId;

        addRecipeFormContainer.style.display = 'block'; 
        addRecipeButton.textContent = 'Save Changes'; 
        formTitle.textContent = 'Update Recipe'; // Update the form title
        console.log('Form container display set to block');
        toggleBlurAndOverlay(true);

        document.getElementById('recipe-title-input').value = recipeData.title || '';
        document.getElementById('recipe-ingredients-input').value = recipeData.ingredients || '';
        document.getElementById('recipe-instructions-input').value = recipeData.instructions || '';
        document.getElementById('recipe-tags-input').value = recipeData.tags || '';
        document.getElementById('recipe-servings-input').value = recipeData.servings || '';
        document.getElementById('recipe-origin-input').value = recipeData.origin || '';
    };

    const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) {
        showMessage('You must be logged in to add or edit recipes');
        return;
    }

    const formData = new FormData(addRecipeForm);
    const recipeData = Object.fromEntries(formData.entries());
    recipeData.uid = currentUser.uid;

    const tags = formData.get('tags').split(',').map(tag => tag.trim());
    if (checkDuplicateTags(tags)) {
        errorMessage.textContent = 'Duplicate tags are not allowed.';
        errorMessage.style.display = 'block';
        return;
    }
    errorMessage.style.display = 'none';

    addRecipeButton.disabled = true;
    showLoadingIndicator(true);

    try {
        const endpoint = isUpdateMode ? `/update_recipe/${currentRecipeId}` : '/add_recipe';
        const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(recipeData),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        showMessage(data.message);

        if (data.success) {
            addRecipeForm.reset();
            addRecipeFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);

            if (isUpdateMode) {
                await fetchAndDisplayRecipeDetails(currentRecipeId);
            }

            const recipes = await fetchRecipes(searchBox.value.trim());
            renderRecipes(recipes);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('An error occurred while saving the recipe. Please try again.');
    } finally {
        addRecipeButton.disabled = false;
        showLoadingIndicator(false);
    }
};



    addRecipeForm.addEventListener('submit', handleFormSubmit);

    const checkDuplicateTags = (tags) => {
        const tagSet = new Set(tags);
        return tagSet.size !== tags.length;
    };

    searchBox.addEventListener('input', handleSearch);

    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        isUpdateMode = false;
        currentRecipeId = null;
        addRecipeFormContainer.style.display = 'block';
        addRecipeButton.textContent = 'Add Recipe'; 
        formTitle.textContent = 'Add New Recipe'; // Set the form title to Add New Recipe
        toggleBlurAndOverlay(true);
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
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

    window.addEventListener('click', async (event) => {
        console.log('Window click event:', event.target);
        if (!recipeDetailsContainer.contains(event.target) && recipeDetailsContainer.style.display === 'block') {
            recipeDetailsContainer.style.display = 'none';
            recipeTitle.textContent = '';
            toggleBlurAndOverlay(false);
            // Refresh the view
            const recipes = await fetchRecipes(lastQuery);
            renderRecipes(recipes);
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
            // Optionally revert the checkbox state if an error occurs
            favoriteCheckbox.checked = !isFavorite;
        }
    };

    viewFavoritesLink.addEventListener('click', async () => {
        if (!currentUser) {
            showMessage('You must be logged in to view favorites');
            return;
        }
        try {
            const response = await fetch(`/favorites?uid=${currentUser.uid}`);
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
            resultsContainer.innerHTML = ''; // Clear the results container
            const tagListContainer = document.createElement('div');
            tagListContainer.className = 'tags-list-container';
            
            const tagList = document.createElement('ul');
            tags.forEach(tag => {
                const tagItem = document.createElement('li');
                tagItem.textContent = tag;
                tagItem.className = 'tag-item'; // Add a class for styling
                tagItem.addEventListener('click', async () => {
                    // Add click animation class
                    tagItem.classList.add('clicked');
                    setTimeout(() => {
                        tagItem.classList.remove('clicked');
                    }, 300); // Duration of the animation

                    searchBox.value = `Tags: ${tag}`; // Indicate tag search
                    lastQuery = `Tags: ${tag}`; // Store the last query
                    const recipes = await fetchRecipesByTag(tag); // Fetch recipes by tag
                    renderRecipes(recipes); // Render the recipes
                });
                tagList.appendChild(tagItem);
            });
            tagListContainer.appendChild(tagList);
            resultsContainer.appendChild(tagListContainer);
            searchBox.value = 'Tags'; // Set the search box text to "Tags"
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    });

    // Fetch recipes by tag
    const fetchRecipesByTag = async (tag) => {
        try {
            const response = await fetch(`/search_by_tag?tag=${encodeURIComponent(tag)}`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching recipes by tag:', error);
            return [];
        }
    };

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
