from flask import Flask, request, jsonify, render_template
from flask_caching import Cache
import mysql.connector
from mysql.connector import Error, pooling
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/search*": {"origins": "*"}})

# Cache configuration
cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app)

# Database configuration using environment variables
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'pool_name': 'mypool',
    'pool_size': 5,
}

# Create a connection pool
connection_pool = mysql.connector.pooling.MySQLConnectionPool(pool_name=db_config['pool_name'],
                                                              pool_size=db_config['pool_size'],
                                                              pool_reset_session=True,
                                                              host=db_config['host'],
                                                              database=db_config['database'],
                                                              user=db_config['user'],
                                                              password=db_config['password'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['GET'])
@cache.cached(timeout=60, query_string=True)
def search_recipes():
    query_param = request.args.get('query')
    print(f"Search Query: {query_param}")
    result = []

    try:
        connection = connection_pool.get_connection()
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
        result = []
    finally:
        if connection.is_connected():
            connection.close()

    return jsonify(result)

@app.route('/recipe_details/<int:recipe_id>', methods=['GET'])
@cache.cached(timeout=60)
def recipe_details(recipe_id):
    try:
        connection = connection_pool.get_connection()
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
        if connection.is_connected():
            cursor.close()
            connection.close()

    return jsonify(details)

@app.route('/add_recipe', methods=['POST'])
def add_recipe():
    data = request.get_json()
    title = data.get('title')
    ingredients = data.get('ingredients')
    instructions = data.get('instructions')

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        
        cursor.execute("INSERT INTO recipes (Title) VALUES (%s)", (title,))
        recipe_id = cursor.lastrowid
        
        for ingredient in ingredients.split('\n'):
            name, unit, quantity = ingredient.split(',')
            cursor.execute("INSERT INTO ingredients (RecipeID, Name, Unit, Quantity) VALUES (%s, %s, %s, %s)",
                           (recipe_id, name.strip(), unit.strip(), quantity.strip()))
        
        for step_number, instruction in enumerate(instructions.split('\n'), start=1):
            cursor.execute("INSERT INTO instructions (RecipeID, StepNumber, Description) VALUES (%s, %s, %s)",
                           (recipe_id, step_number, instruction.strip()))
        
        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        return jsonify({'success': False, 'error': str(e)})
    finally:
        if connection.is_connected():
            connection.close()

    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
