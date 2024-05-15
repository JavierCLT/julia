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

    # Log database configuration
    print(f"Database Configuration: {db_config}")

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            print("Connected to the database.")
        else:
            print("Failed to connect to the database.")
            
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
        print(f"Query Result: {result}")
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
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            print("Connected to the database for recipe details.")
        else:
            print("Failed to connect to the database for recipe details.")

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

        # Combine data into one response
        details = {
            'ingredients': ingredients,
            'instructions': instructions
        }

    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        details = {'error': 'An error occurred while fetching recipe details.'}
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

    return jsonify(details)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORTG', 8080)))
