document.getElementById('search-box').addEventListener('input', function(event) {
    const searchQuery = this.value.trim();
    const resultsContainer = document.getElementById('results');
    clearTimeout(this.delay); // Debounce setup to wait until user stops typing
    this.delay = setTimeout(() => {
        if (searchQuery.length > 2) {
            fetch(`https://foods-cad3aa2b09ba.herokuapp.com/search?query=${encodeURIComponent(searchQuery)}`)
                .then(response => response.json())
                .then(data => {
                    resultsContainer.innerHTML = '';
                    let grid = document.createElement('div');
                    grid.className = 'grid';
                    data.forEach(recipe => {
                        const recipeElement = document.createElement('div');
                        recipeElement.className = 'recipe-box';
                        recipeElement.innerHTML = `<h3 class="recipe-title" data-id="${recipe.id}">${recipe.title}</h3>`;
                        recipeElement.onclick = () => fetchAndDisplayFoodDetails(recipe.id);
                        grid.appendChild(recipeElement);
                    });
                    resultsContainer.appendChild(grid);
                })
                .catch(error => console.error('Error:', error));
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 300); // Wait for 300 ms after the user stops typing
});

// JavaScript function to fetch and display recipe details
function fetchAndDisplayFoodDetails(id) {
    fetch(`/recipe_details/${id}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            let explanationHtml = '';
            if (data.explanation) {
                explanationHtml = `<p>${data.explanation}</p>`;
            }
            detailsContainer.innerHTML = `<h2>${data.title}</h2>${explanationHtml}`;
            detailsContainer.style.display = 'block';
        })
        .catch(error => console.error('Error fetching food details:', error));
}

function toggleBlurAndOverlay(show) {
    const overlay = document.getElementById('darkOverlay');
    const backgroundContent = document.querySelector('.container');
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
    if (targetElement) {
        const id = targetElement.getAttribute('data-id');
        if (id) {
            // Fetch and display recipe details
            fetchAndDisplayFoodDetails(id);
            // Show the details and the overlay
            toggleBlurAndOverlay(true);
        }
    }
});

// JavaScript to close the recipe details view when clicking outside
window.addEventListener('click', function(event) {
    const detailsContainer = document.getElementById('recipe-details-container');
    if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
        detailsContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
    }
});
