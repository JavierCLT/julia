document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('results');
    const addRecipeFormContainer = document.getElementById('add-recipe-form-container');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeDetailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    const darkOverlay = document.getElementById('darkOverlay');
    const container = document.querySelector('.container');
    let isEdit = false;
    let editRecipeId = null;

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
        if (searchQuery.length > 3) {
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
                instructionsHtml += `<li>Step ${instruction.StepNumber}: ${instruction.Description}</li>`;
            });
            instructionsHtml += '</ul>';

            const buttonsHtml = `
                <button id="edit-recipe-btn" class="edit-recipe-btn">Edit Recipe</button>
                <button id="delete-recipe-btn" class="delete-recipe-btn">Delete Recipe</button>
            `;

            while (recipeTitle.nextSibling) {
                recipeDetailsContainer.removeChild(recipeTitle.nextSibling);
            }

            recipeTitle.insertAdjacentHTML('afterend', buttonsHtml + ingredientsHtml + instructionsHtml);
            recipeDetailsContainer.style.display = 'block';

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

            document.getElementById('edit-recipe-btn').onclick = () => {
                isEdit = true;
                editRecipeId = recipeId;
                populateFormWithRecipeDetails(recipeId);
                addRecipeFormContainer.style.display = 'block';
                toggleBlurAndOverlay(true);
            };

        } catch (error) {
            console.error('Error fetching recipe details:', error);
        }
    };

    const populateFormWithRecipeDetails = async (recipeId) => {
        try {
            const response = await fetch(`/recipe_details/${encodeURIComponent(recipeId)}`);
            const data = await response.json();
            document.getElementById('recipe-title-input').value = recipeTitle.textContent;
            document.getElementById('recipe-ingredients-input').value = data.ingredients.map(ing => ing.Description).join('\n');
            document.getElementById('recipe-instructions-input').value = data.instructions.map(ins => ins.Description).join('\n');
        } catch (error) {
            console.error('Error populating form with recipe details:', error);
        }
    };

    searchBox.addEventListener('input', handleSearch);

    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'block';
        toggleBlurAndOverlay(true);
        isEdit = false;
        editRecipeId = null;
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        addRecipeFormContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
    });

    addRecipeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addRecipeForm);
        const formDataJson = JSON.stringify(Object.fromEntries(formData));

        try {
            let response, data;
            if (isEdit && editRecipeId) {
                response = await fetch(`/update_recipe/${encodeURIComponent(editRecipeId)}`, {
                    method: 'POST',
                    body: formDataJson,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                response = await fetch('/add_recipe', {
                    method: 'POST',
                    body: formDataJson,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            data = await response.json();
            alert(data.message);
            if (data.success) {
                addRecipeForm.reset();
                addRecipeFormContainer.style.display = 'none';
                toggleBlurAndOverlay(false);
            }
        } catch (error) {
            console.error('Error adding/updating recipe:', error);
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
        } else if (!addRecipeFormContainer.contains(event.target) && addRecipeFormContainer.style.display === 'block') {
            addRecipeFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
        }
    });

    darkOverlay.addEventListener('click', () => {
        if (addRecipeFormContainer.style.display === 'block') {
            addRecipeFormContainer.style.display = 'none';
            toggleBlurAndOverlay(false);
        }
        if (recipeDetailsContainer.style.display === 'block') {
            recipeDetailsContainer.style.display = 'none';
            recipeTitle.textContent = '';
            toggleBlurAndOverlay(false);
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
