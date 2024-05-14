from flask import Flask, request, jsonify, render_template
import mysql.connector
from mysql.connector import Error
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/search*": {"origins": "*"}})  # Adjust as needed for production

# Database configuration using environment variables
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search_recipes():
    query_param = request.args.get('query')  # This is the search term
    print(f"Search Query: {query_param}")
    result = []

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT MIN(recipes.RecipeID) as RecipeID, recipes.Title
        FROM recipes
        LEFT JOIN recipecategory ON recipes.RecipeID = recipecategory.RecipeID
        LEFT JOIN category ON recipecategory.CategoryID = category.CategoryID
        LEFT JOIN recipetags ON recipes.RecipeID = recipetags.RecipeID
        LEFT JOIN tags ON recipetags.TagID = tags.TagID
        LEFT JOIN ingredients ON recipes.RecipeID = ingredients.RecipeID
        WHERE recipes.Title LIKE %s 
            OR ingredients.Name LIKE %s 
            OR category.CategoryName LIKE %s 
            OR tags.TagName LIKE %s
        GROUP BY recipes.Title
        """
        like_pattern = f"%{query_param}%"
        cursor.execute(query, (like_pattern, like_pattern, like_pattern, like_pattern))
        result = cursor.fetchall()
        cursor.close()
    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        result = []  # Return an empty list in case of error
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify(result)

# New route for fetching recipe details
@app.route('/recipe_details/<int:recipe_id>', methods=['GET'])
def recipe_details(recipe_id):
    # Connect to the database and retrieve details
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor(dictionary=True)

    print(f"Executing query with recipe_id: {recipe_id}")

    # Fetch ingredients
    cursor.execute("""
        SELECT Name, Unit, Quantity
        FROM ingredients
        WHERE RecipeID = %s
        ORDER BY IngredientID
    """, (recipe_id,))
    ingredients = cursor.fetchall()

    # Fetch instructions
    cursor.execute("""
        SELECT StepNumber, Description
        FROM instructions
        WHERE RecipeID = %s
        ORDER BY StepNumber
    """, (recipe_id,))
    instructions = cursor.fetchall()

    # Close connection
    cursor.close()
    connection.close()

    # Combine data into one response
    details = {
        'ingredients': ingredients,
        'instructions': instructions
    }

    return jsonify(details)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
