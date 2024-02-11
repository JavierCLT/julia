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
// JavaScript function to fetch and display recipe details
function fetchAndDisplayFoodDetails(id) {
    fetch(`/recipe_details/${id}`)
        .then(response => response.json())
        .then(data => {
            const detailsContainer = document.getElementById('recipe-details-container');
            let explanationHtml = '';
            if (data.explanation) {
                // Format the explanation text to bold text before the first colon
                explanationHtml = formatExplanation(data.explanation);
                explanationHtml = `<p>${explanationHtml}</p>`;
            }
            detailsContainer.innerHTML = `<h2>${data.title}</h2>${explanationHtml}`;
            detailsContainer.style.display = 'block';
        })
        .catch(error => console.error('Error fetching food details:', error));
}

// Add this function to your JS
function formatExplanation(text) {
  // Split the text into an array of lines
  const lines = text.split('\n');
  
  // Map over each line, and apply bold formatting to the text before the first colon
  const formattedLines = lines.map(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      // Only wrap text before the colon if there is a colon
      return `<strong>${line.slice(0, colonIndex + 1)}</strong>${line.slice(colonIndex + 1)}`;
    }
    return line; // Return the line unchanged if there is no colon
  });

  // Join the array back into a single string with line breaks
  return formattedLines.join('<br>'); // Use <br> instead of \n for HTML line breaks
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
