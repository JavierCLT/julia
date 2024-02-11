document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim();
    const resultsContainer = document.getElementById('results');
    if (searchQuery.length > 2) {
        fetch(`https://foods-cad3aa2b09ba.herokuapp.com/search?query=${encodeURIComponent(searchQuery)}`)
            .then(response => response.json())
            .then(data => {
                resultsContainer.innerHTML = '';
                let grid = document.createElement('div');
                grid.className = 'grid';
                if (data.length > 0) {
                    const recipe = data[0]; // Assuming only one result for simplicity
                    const recipeElement = document.createElement('div');
                    recipeElement.className = 'recipe-box';
                    recipeElement.innerHTML = `<h3 class="recipe-title" data-id="${recipe.id}">${recipe.title}</h3>`;
                    recipeElement.onclick = () => fetchAndDisplayFoodDetails(recipe.id);
                    grid.appendChild(recipeElement);
                }
                resultsContainer.appendChild(grid);
            })
            .catch(error => console.error('Error:', error));
    }
});

// JavaScript function to fetch and display recipe details
function fetchAndDisplayFoodDetails(id) {
    fetch(`/recipe_details/${id}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            const explanationParagraphs = data.explanation.map(line => `<p>${line}</p>`).join('');
            detailsContainer.innerHTML = `<h2>${data.title}</h2>${explanationParagraphs}`;
            detailsContainer.style.display = 'block';
        })
        .catch(error => console.error('Error fetching food details:', error));
}

function toggleBlurAndOverlay(show) {
    const overlay = document.getElementById('darkOverlay');
    const backgroundContent = document.querySelector('.container'); // This should be the container of your background content.
    if (show) {
        overlay.style.display = 'block';
        backgroundContent.classList.add('blur-background');
    } else {
        overlay.style.display = 'none';
        backgroundContent.classList.remove('blur-background');
    }
}


// Event delegation to handle clicks on recipe titles
document.addEventListener('click', function(event) {
    let targetElement = event.target.closest('.recipe-box');
    
    // Check if a recipe-box was clicked
    if (targetElement) {
        const recipeId = targetElement.getAttribute('data-recipe-id');
        if (recipeId) {
            // Retrieve the title from the clicked element and update the yellow area
            const recipeTitle = targetElement.querySelector('.recipe-title').textContent;
            document.getElementById('recipe-title').textContent = recipeTitle;
            
            // Fetch and display recipe details
            fetchAndDisplayRecipeDetails(recipeId);

            // Call this function when a recipe is clicked to show the details and the overlay
            toggleBlurAndOverlay(true);
        }
    }
});

// JavaScript to close the recipe details view when clicking outside
window.addEventListener('click', function(event) {
    const detailsContainer = document.getElementById('recipe-details-container');
    const recipeTitle = document.getElementById('recipe-title');
    // Check if the click is outside the recipe details and if the details container is currently shown
    if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
        detailsContainer.style.display = 'none';
        recipeTitle.textContent = ''; // Clear the title when the details view is closed
        toggleBlurAndOverlay(false);
    }
});
