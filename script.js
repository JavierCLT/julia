<!-- Firebase App (the core Firebase SDK) is always required and must be listed first -->
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"></script>

// Your web app's Firebase configuration
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const searchBox = document.getElementById('search-box');
const resultsDiv = document.getElementById('results');
const recipeDetailsContainer = document.getElementById('recipe-details-container');
const darkOverlay = document.getElementById('darkOverlay');

// Function to search recipes by title, category, or tags
async function searchRecipes(text) {
  if (text.length < 3) {
    resultsDiv.innerHTML = '';
    return;
  }

  // Normalize the text for case-insensitive searching
  const lowerCaseText = text.toLowerCase();

  // Build a query to search recipes by title, category, or tags
  const recipesRef = collection(db, 'recipes');
  const q = query(recipesRef, 
    where('Title', '>=', lowerCaseText),
    where('Title', '<=', lowerCaseText + '\uf8ff')
  );

  const querySnapshot = await getDocs(q);
  
  // Clear previous results
  resultsDiv.innerHTML = '';

  querySnapshot.forEach(doc => {
    const recipe = doc.data();
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe-box');
    recipeDiv.textContent = recipe.Title;

    // Click on a recipe box to show recipe details
    recipeDiv.addEventListener('click', () => showRecipeDetails(recipe));

    resultsDiv.appendChild(recipeDiv);
  });

  if (!querySnapshot.empty) return;

  // If no results by Title, try searching by Category and Tags
  const categoryQuery = query(recipesRef, 
    where('Category', '==', lowerCaseText)
  );
  const categorySnapshot = await getDocs(categoryQuery);

  categorySnapshot.forEach(doc => {
    const recipe = doc.data();
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe-box');
    recipeDiv.textContent = recipe.Title;

    recipeDiv.addEventListener('click', () => showRecipeDetails(recipe));
    resultsDiv.appendChild(recipeDiv);
  });

  if (!categorySnapshot.empty) return;

  // Tags might need to be searched differently because they are in array
  const tagsQuery = query(recipesRef, 
    where('Tags', 'array-contains', lowerCaseText)
  );
  const tagsSnapshot = await getDocs(tagsQuery);

  tagsSnapshot.forEach(doc => {
    const recipe = doc.data();
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe-box');
    recipeDiv.textContent = recipe.Title;

    recipeDiv.addEventListener('click', () => showRecipeDetails(recipe));
    resultsDiv.appendChild(recipeDiv);
  });
}

// Show Recipe Details
function showRecipeDetails(recipe) {
  recipeDetailsContainer.style.display = 'block';
  darkOverlay.style.display = 'block';
  document.body.classList.add('blur-background');

  document.getElementById('recipe-title').textContent = recipe.Title;

  const ingredientsList = recipeDetailsContainer.querySelector('.ingredients-card ul');
  ingredientsList.innerHTML = '';
  recipe.Ingredients.forEach(ingredient => {
    const li = document.createElement('li');
    li.textContent = ingredient;
    ingredientsList.appendChild(li);
  });

  const instructionsList = recipeDetailsContainer.querySelector('.instructions-card ul');
  instructionsList.innerHTML = '';
  recipe["Numbered Instructions"].forEach((instruction, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${instruction}`;
    instructionsList.appendChild(li);
  });
}

// Close the recipe details
darkOverlay.addEventListener('click', () => {
  recipeDetailsContainer.style.display = 'none';
  darkOverlay.style.display = 'none';
  document.body.classList.remove('blur-background');
});

// Event listener for search box
searchBox.addEventListener('input', (e) => searchRecipes(e.target.value));
