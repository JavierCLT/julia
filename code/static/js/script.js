const fetchAndDisplayRecipeDetails = async (recipeId) => {
    try {
        const response = await fetch(`/recipe_details/${encodeURIComponent(recipeId)}`);
        const data = await response.json();
        
        // Create ingredients HTML
        let ingredientsHtml = '<h3>Ingredients:</h3><ul>';
        data.ingredients.forEach(ingredient => {
            ingredientsHtml += `<li>${ingredient.Description}</li>`;
        });
        ingredientsHtml += '</ul>';

        // Create instructions HTML
        let instructionsHtml = '<h3>Instructions:</h3><ul>';
        data.instructions.forEach(instruction => {
            instructionsHtml += `<li>${instruction.Description}</li>`;
        });
        instructionsHtml += '</ul>';

        // Clear the recipe details container content except for the title and buttons
        const ingredientsContainer = recipeDetailsContainer.querySelector('.ingredients-card ul');
        const instructionsContainer = recipeDetailsContainer.querySelector('.instructions-card ul');

        ingredientsContainer.innerHTML = ingredientsHtml;
        instructionsContainer.innerHTML = instructionsHtml;

        recipeTitle.textContent = data.title;
        recipeDetailsContainer.style.display = 'block';

        // Show the edit and delete buttons
        editRecipeBtn.style.display = 'inline-block';
        deleteRecipeBtn.style.display = 'inline-block';

        // Add event listeners to the buttons
        editRecipeBtn.onclick = () => {
            const titleInput = document.getElementById('recipe-title-input');
            const ingredientsInput = document.getElementById('recipe-ingredients-input');
            const instructionsInput = document.getElementById('recipe-instructions-input');

            titleInput.value = recipeTitle.textContent;
            ingredientsInput.value = data.ingredients.map(ingredient => ingredient.Description).join('\n');
            instructionsInput.value = data.instructions.map(instruction => instruction.Description).join('\n');

            addRecipeFormContainer.style.display = 'block';
            toggleBlurAndOverlay(true);

            addRecipeForm.onsubmit = async (event) => {
                event.preventDefault();
                const formData = new FormData(addRecipeForm);
                formData.append('recipe_id', recipeId);

                try {
                    const response = await fetch(`/update_recipe/${recipeId}`, {
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
                        recipeDetailsContainer.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error updating recipe:', error);
                }
            };
        };

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
