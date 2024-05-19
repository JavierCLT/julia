document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeDetailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const darkOverlay = document.getElementById('darkOverlay');
    const container = document.querySelector('.container');

    let currentRecipeId = null;

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

            while (recipeTitle.nextSibling) {
                recipeDetailsContainer.removeChild(recipeTitle.nextSibling);
            }

            recipeTitle.insertAdjacentHTML('afterend', ingredientsHtml + instructionsHtml);
            recipeDetailsContainer.style.display = 'block';

            currentRecipeId = recipeId;  // Set the current recipe ID for editing

            deleteRecipeBtn.onclick = async () => {
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
            };
        } catch (error) {
            console.error('Error fetching recipe details:', error);
        }
    };

    const fetchRecipeDetailsForEdit = async (recipeId) => {
        try {
            const response = await fetch(`/recipe_details/${encodeURIComponent(recipeId)}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching recipe details for edit:', error);
            return null;
        }
    };

    const populateEditForm = (recipe) => {
        document.getElementById('recipe-title-input').value = recipe.title;
        document.getElementById('recipe-ingredients-input').value = recipe.ingredients.map(ing => ing.Description).join('\n');
        document.getElementById('recipe-instructions-input').value = recipe.instructions.map(ins => ins.Description).join('\n');
    };

    searchBox.addEventListener('input', handleSearch);

    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'block';
        toggleBlurAndOverlay(true);
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
    });

    addRecipeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addRecipeForm);
        const endpoint = currentRecipeId ? `/update_recipe/${currentRecipeId}` : '/add_recipe';
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
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
                currentRecipeId = null;
            }
        } catch (error) {
            console.error('Error adding/updating recipe:', error);
        }
    });

    editRecipeBtn.addEventListener('click', async () => {
        const recipe = await fetchRecipeDetailsForEdit(currentRecipeId);
        if (recipe) {
            populateEditForm({
                title: recipe.title,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions
            });
            addRecipeFormContainer.style.display = 'block';
            toggleBlurAndOverlay(true);
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
        if (!recipeDetailsContainer.contains(event.target) && recipeDetailsContainer.style.display === 'block') {
            recipeDetailsContainer.style.display = 'none';
            recipeTitle.textContent = '';
            toggleBlurAndOverlay(false);
        }
    });
});
