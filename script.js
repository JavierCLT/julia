// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, query, orderByChild, get } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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
const db = getDatabase(app);

document.getElementById('search-box').addEventListener('input', async function(e) {
  const searchText = e.target.value.toLowerCase();
  if (searchText.length >= 3) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results

    // Search in the "recipes" node by Title
    const recipesRef = ref(db, 'recipes');
    const recipesQuery = query(recipesRef, orderByChild('Title'));

    get(recipesQuery).then((snapshot) => {
      let hasResults = false;
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.Title && data.Title.toLowerCase().includes(searchText)) {
          appendRecipeResult(data, resultsDiv);
          hasResults = true;
        }
      });

      if (!hasResults) {
        resultsDiv.innerHTML = '<p>No recipes found.</p>';
      }
    });
  } else {
    document.getElementById('results').innerHTML = '';
  }
});

function appendRecipeResult(data, resultsDiv) {
  const resultElement = document.createElement('div');
  resultElement.classList.add('recipe-box');
  resultElement.textContent = data.Title;
  resultElement.onclick = () => showRecipeDetails(data);
  resultsDiv.appendChild(resultElement);
}

function showRecipeDetails(data) {
  const detailsContainer = document.getElementById('recipe-details-container');
  document.getElementById('recipe-title').textContent = data.Title;
  
  // Populate ingredients
  const ingredientsList = detailsContainer.querySelector('.ingredients-card ul');
  ingredientsList.innerHTML = '';
  if (data.Ingredients) {
    data.Ingredients.forEach(ingredient => {
      const li = document.createElement('li');
      li.textContent = ingredient;
      ingredientsList.appendChild(li);
    });
  } else {
    ingredientsList.innerHTML = '<li>No ingredients listed.</li>';
  }

  // Populate instructions
  const instructionsCard = detailsContainer.querySelector('.instructions-card ul');
  instructionsCard.innerHTML = '';
  if (data['Numbered Instructions']) {
    Object.keys(data['Numbered Instructions']).forEach(key => {
      const li = document.createElement('li');
      li.textContent = data['Numbered Instructions'][key];
      instructionsCard.appendChild(li);
    });
  } else {
    instructionsCard.innerHTML = '<li>No instructions provided.</li>';
  }

  // Show details container
  detailsContainer.style.display = 'block';
  document.getElementById('darkOverlay').style.display = 'block';
  document.body.classList.add('blur-background');
}

document.getElementById('darkOverlay').addEventListener('click', function() {
  document.getElementById('recipe-details-container').style.display = 'none';
  this.style.display = 'none';
  document.body.classList.remove('blur-background');
});
