from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from flask_caching import Cache
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error, pooling
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import os
import re

app = Flask(__name__)
CORS(app, resources={r"/search*": {"origins": "*"}})
bcrypt = Bcrypt(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
app.secret_key = os.getenv('SECRET_KEY', 'mysecret')

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
    'pool_size': 10,
}

# Create a connection pool
connection_pool = mysql.connector.pooling.MySQLConnectionPool(pool_name=db_config['pool_name'],
                                                              pool_size=db_config['pool_size'],
                                                              pool_reset_session=True,
                                                              host=db_config['host'],
                                                              database=db_config['database'],
                                                              user=db_config['user'],
                                                              password=db_config['password'])

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, id, username, email, password):
        self.id = id
        self.username = username
        self.email = email
        self.password = password

    @staticmethod
    def get(user_id):
        try:
            connection = connection_pool.get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE UserID = %s", (user_id,))
            user_data = cursor.fetchone()
            if user_data:
                return User(user_data['UserID'], user_data['Username'], user_data['Email'], user_data['Password'])
            return None
        except Error as e:
            print(f"Error while connecting to MySQL or executing query: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['GET'])
@cache.cached(timeout=60, query_string=True)
def search_recipes():
    query_param = request.args.get('query', '')
    result = []
    connection = None
    cursor = None

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
    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        result = []
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify(result)

@app.route('/recipe_details/<int:recipe_id>', methods=['GET'])
@cache.cached(timeout=60)
def recipe_details(recipe_id):
    details = {'ingredients': [], 'instructions': [], 'tags': [], 'servings': None, 'origin': None, 'title': None, 'is_favorite': False}
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        # Fetch title, servings, origin, and is_favorite
        cursor.execute("""
            SELECT Title, Servings, Origin, is_favorite
            FROM recipes
            WHERE RecipeID = %s
        """, (recipe_id,))
        result = cursor.fetchone()
        if result:
            details['title'] = result['Title']
            details['servings'] = result['Servings']
            details['origin'] = result['Origin']
            details['is_favorite'] = result['is_favorite']

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

    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        details = {'error': 'An error occurred while fetching recipe details.'}
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify(details)

@app.route('/add_recipe', methods=['POST'])
@login_required
def add_recipe():
    data = request.json
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    tags = [tag.strip() for tag in data.get('tags').split(',')]
    servings = data.get('servings')
    origin = data.get('origin')
    is_favorite = data.get('is_favorite', False)

    print("Received tags:", tags)  # Debugging line

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()

        cursor.execute("INSERT INTO recipes (Title, UserID, Servings, Origin, is_favorite) VALUES (%s, %s, %s, %s, %s)", (title, current_user.id, servings, origin, is_favorite))
        recipe_id = cursor.lastrowid

        for ingredient in ingredients:
            cursor.execute("INSERT INTO ingredients (RecipeID, Description) VALUES (%s, %s)", (recipe_id, ingredient.strip()))

        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("INSERT INTO instructions (RecipeID, StepNumber, Description) VALUES (%s, %s, %s)", (recipe_id, step_number, instruction.strip()))

        for tag in tags:
            cursor.execute("SELECT TagID FROM tags WHERE TagName = %s", (tag,))
            tag_id = cursor.fetchone()
            if not tag_id:
                cursor.execute("INSERT INTO tags (TagName) VALUES (%s)", (tag,))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag_id[0]
            cursor.execute("INSERT INTO recipetags (RecipeID, TagID) VALUES (%s, %s)", (recipe_id, tag_id))

        connection.commit()
        return jsonify({'success': True, 'message': 'Recipe added successfully!'})
    except Error as e:
        print(f"Error while adding recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while adding the recipe.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe added successfully!'})

@app.route('/delete_recipe/<int:recipe_id>', methods=['POST'])
@login_required
def delete_recipe(recipe_id):
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()

        # Delete the recipe and associated data
        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipes WHERE RecipeID = %s AND UserID = %s", (recipe_id, current_user.id))

        # Commit the changes
        connection.commit()

        # Cleanup orphaned tags
        cursor.execute("""
            DELETE tags FROM tags
            LEFT JOIN recipetags ON tags.TagID = recipetags.TagID
            WHERE recipetags.TagID IS NULL
        """)
        connection.commit()

        return jsonify({'success': True, 'message': 'Recipe deleted and orphaned tags cleaned up successfully!'})
    except Error as e:
        print(f"Error while deleting recipe with ID {recipe_id}: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the recipe.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/update_recipe/<int:recipe_id>', methods=['POST'])
@login_required
def update_recipe(recipe_id):
    data = request.get_json()
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    tags = [tag.strip() for tag in data.get('tags').split(',')]
    servings = data.get('servings')
    origin = data.get('origin')
    is_favorite = data.get('is_favorite', False)

    print("Received tags for update:", tags)  # Debugging line

    # Validate servings to allow numbers and ranges like "8-10"
    if not re.match(r'^\d+(-\d+)?$', servings):
        return jsonify({'success': False, 'message': 'Invalid format for servings. Use a number or a range like "8-10".'})

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()

        cursor.execute("UPDATE recipes SET Title = %s, Servings = %s, Origin = %s, is_favorite = %s WHERE RecipeID = %s AND UserID = %s", (title, servings, origin, is_favorite, recipe_id, current_user.id))

        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        for ingredient in ingredients:
            cursor.execute("INSERT INTO ingredients (RecipeID, Description) VALUES (%s, %s)", (recipe_id, ingredient.strip()))

        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("INSERT INTO instructions (RecipeID, StepNumber, Description) VALUES (%s, %s, %s)", (recipe_id, step_number, instruction.strip()))

        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))
        for tag in tags:
            cursor.execute("SELECT TagID FROM tags WHERE TagName = %s", (tag,))
            tag_id = cursor.fetchone()
            if not tag_id:
                cursor.execute("INSERT INTO tags (TagName) VALUES (%s)", (tag,))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag_id[0]
            cursor.execute("INSERT INTO recipetags (RecipeID, TagID) VALUES (%s, %s)", (recipe_id, tag_id))

        connection.commit()
        return jsonify({'success': True, 'message': 'Recipe updated successfully!'})
    except Error as e:
        print(f"Error while updating recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the recipe.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe updated successfully!'})

@app.route('/favorites', methods=['GET'])
@login_required
def get_favorites():
    result = []
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM recipes WHERE is_favorite = TRUE AND UserID = %s", (current_user.id,))
        result = cursor.fetchall()
    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        result = []
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify(result)

@app.route('/update_favorite/<int:recipe_id>', methods=['POST'])
@login_required
def update_favorite(recipe_id):
    data = request.json
    is_favorite = data.get('is_favorite', False)

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE recipes SET is_favorite = %s WHERE RecipeID = %s AND UserID = %s", (is_favorite, recipe_id, current_user.id))
        connection.commit()
        return jsonify({'success': True, 'message': 'Favorite status updated successfully!'})
    except Error as e:
        print(f"Error while updating favorite status for recipe ID {recipe_id}: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the favorite status.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            
@app.route('/tags', methods=['GET'])
@login_required
def get_tags():
    result = []
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT TagName FROM tags")
        result = [tag['TagName'] for tag in cursor.fetchall()]
    except Error as e:
        print(f"Error while connecting to MySQL or executing query: {e}")
        result = []
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify(result)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO users (Username, Email, Password) VALUES (%s, %s, %s)", (username, email, hashed_password))
        connection.commit()
    except Error as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'message': 'Registration failed.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Registration successful.'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT UserID, Password FROM users WHERE Email = %s", (email,))
        user = cursor.fetchone()
        if user and bcrypt.check_password_hash(user['Password'], password):
            user_obj = User(user['UserID'], None, email, user['Password'])
            login_user(user_obj)
            return jsonify({'success': True, 'message': 'Login successful.'})
        else:
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401
    except Error as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'message': 'Login failed.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully!'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
