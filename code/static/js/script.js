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
                        recipeElement.onclick = () => {
                            fetchAndDisplayFoodDetails(recipe.id, recipe.title);
                            updateURL(recipe.title);
                        };
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

function fetchAndDisplayFoodDetails(id, title) {
    fetch(`/recipe_details/${id}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            let explanationHtml = '';
            if (data.explanation) {
                explanationHtml = formatExplanation(data.explanation);
                explanationHtml = `<p>${explanationHtml}</p>`;
            }
            detailsContainer.innerHTML = `<h2>${title}</h2>${explanationHtml}`;
            detailsContainer.style.display = 'block';
        })
        .catch(error => console.error('Error fetching food details:', error));
}

function formatExplanation(text) {
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            return `<strong>${line.slice(0, colonIndex + 1)}</strong>${line.slice(colonIndex + 1)}`;
        }
        return line;
    });
    return formattedLines.join('<br>');
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

document.addEventListener('click', function(event) {
    let targetElement = event.target.closest('.recipe-box');
    if (targetElement) {
        const id = targetElement.getAttribute('data-id');
        const title = targetElement.textContent;
        if (id) {
            fetchAndDisplayFoodDetails(id, title);
            toggleBlurAndOverlay(true);
        }
    }
});

window.addEventListener('click', function(event) {
    const detailsContainer = document.getElementById('recipe-details-container');
    if (!detailsContainer.contains(event.target) && detailsContainer.style.display === 'block') {
        detailsContainer.style.display = 'none';
        toggleBlurAndOverlay(false);
    }
});

// Function to update the URL
function updateURL(title) {
    // Construct the URL with the new title parameter
    const newURL = `${window.location.protocol}//${window.location.host}${window.location.pathname}?title=${encodeURIComponent(title)}`;
    // Use the HTML5 History API to change the URL without reloading the page
    window.history.pushState({ path: newURL }, '', newURL);
}
