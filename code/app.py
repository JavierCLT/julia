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
    result = []

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT 
            MIN(recipes.RecipeID) as RecipeID, 
            recipes.Title
        FROM 
            recipes
        LEFT JOIN 
            recipetags ON recipes.RecipeID = recipetags.RecipeID
        LEFT JOIN 
            tags ON recipetags.TagID = tags.TagID
        LEFT JOIN 
            ingredients ON recipes.RecipeID = ingredients.RecipeID
        WHERE 
            recipes.Title LIKE %s 
            OR ingredients.Description LIKE %s 
            OR tags.TagName LIKE %s
        GROUP BY 
            recipes.Title
        """
        like_pattern = f"%{query_param}%"
        cursor.execute(query, (like_pattern, like_pattern, like_pattern))
        result = cursor.fetchall()
        cursor.close()
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
    details = {'ingredients': [], 'instructions': [], 'tags': [], 'servings': None}
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        # Fetch ingredients
        cursor.execute("""
            SELECT Description
            FROM ingredients
            WHERE RecipeID = %s
            ORDER BY IngredientID
        """, (recipe_id,))
        details['ingredients'] = cursor.fetchall()

        # Fetch instructions
        cursor.execute("""
            SELECT StepNumber, Description
            FROM instructions
            WHERE RecipeID = %s
            ORDER BY StepNumber
        """, (recipe_id,))
        details['instructions'] = cursor.fetchall()

        # Fetch tags
        cursor.execute("""
            SELECT TagName
            FROM tags
            LEFT JOIN recipetags ON tags.TagID = recipetags.TagID
            WHERE recipetags.RecipeID = %s
        """, (recipe_id,))
        details['tags'] = [tag['TagName'] for tag in cursor.fetchall()]

        # Fetch servings
        cursor.execute("""
            SELECT Servings
            FROM recipes
            WHERE RecipeID = %s
        """, (recipe_id,))
        details['servings'] = cursor.fetchone()['Servings']

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
    data = request.json
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    tags = data.get('tags').split(',')
    servings = data.get('servings')
    password = data.get('password')

    if password != os.getenv('SECRET_PASSWORD'):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 403

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        cursor.execute("INSERT INTO recipes (Title, Servings) VALUES (%s, %s)", (title, servings))
        recipe_id = cursor.lastrowid

        for ingredient in ingredients:
            cursor.execute("""
                INSERT INTO ingredients (RecipeID, Description)
                VALUES (%s, %s)
            """, (recipe_id, ingredient.strip()))

        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("""
                INSERT INTO instructions (RecipeID, StepNumber, Description)
                VALUES (%s, %s, %s)
            """, (recipe_id, step_number, instruction.strip()))

        for tag in tags:
            cursor.execute("SELECT TagID FROM tags WHERE TagName = %s", (tag.strip(),))
            tag_id = cursor.fetchone()
            if not tag_id:
                cursor.execute("INSERT INTO tags (TagName) VALUES (%s)", (tag.strip(),))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag_id[0]
            cursor.execute("INSERT INTO recipetags (RecipeID, TagID) VALUES (%s, %s)", (recipe_id, tag_id))

        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error while adding recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while adding the recipe.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe added successfully!'})

@app.route('/delete_recipe/<int:recipe_id>', methods=['POST'])
def delete_recipe(recipe_id):
    data = request.json
    password = data.get('password')

    if password != os.getenv('SECRET_PASSWORD'):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 403

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipes WHERE RecipeID = %s", (recipe_id,))

        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error while deleting recipe with ID {recipe_id}: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the recipe.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe deleted successfully!'})

@app.route('/update_recipe/<int:recipe_id>', methods=['POST'])
def update_recipe(recipe_id):
    data = request.json
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    tags = data.get('tags').split(',')
    servings = data.get('servings')
    password = data.get('password')

    if password != os.getenv('SECRET_PASSWORD'):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 403

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        cursor.execute("UPDATE recipes SET Title = %s, Servings = %s WHERE RecipeID = %s", (title, servings, recipe_id))

        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        for ingredient in ingredients:
            cursor.execute("""
                INSERT INTO ingredients (RecipeID, Description)
                VALUES (%s, %s)
            """, (recipe_id, ingredient.strip()))

        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("""
                INSERT INTO instructions (RecipeID, StepNumber, Description)
                VALUES (%s, %s, %s)
            """, (recipe_id, step_number, instruction.strip()))

        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))
        for tag in tags:
            cursor.execute("SELECT TagID FROM tags WHERE TagName = %s", (tag.strip(),))
            tag_id = cursor.fetchone()
            if not tag_id:
                cursor.execute("INSERT INTO tags (TagName) VALUES (%s)", (tag.strip(),))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag_id['TagID']
            cursor.execute("INSERT INTO recipetags (RecipeID, TagID) VALUES (%s, %s)", (recipe_id, tag_id))

        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error while updating recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the recipe.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe updated successfully!'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
