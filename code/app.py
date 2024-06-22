from flask import Flask, request, jsonify, render_template, session
from flask_caching import Cache
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from oauthlib.oauth2 import WebApplicationClient
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
import requests
import json
import mysql.connector
from mysql.connector import Error, pooling
from flask_cors import CORS
import os
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://jhrecipes.com"}})

# Cache configuration
cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app)

load_dotenv()  # This loads the variables from .env
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

# Secret Key configuration
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY") or os.urandom(24)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

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

@app.route('/')
def index():
    return render_template('index.html', google_client_id=GOOGLE_CLIENT_ID)

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

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()

        cursor.execute("INSERT INTO recipes (Title, UserID, Servings, Origin, is_favorite) VALUES (%s, %s, %s, %s, %s)",
                       (title, current_user.id, servings, origin, is_favorite))
        recipe_id = cursor.lastrowid

        for ingredient in ingredients:
            cursor.execute("INSERT INTO ingredients (RecipeID, Description) VALUES (%s, %s)", (recipe_id, ingredient.strip()))

        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("INSERT INTO instructions (RecipeID, StepNumber, Description) VALUES (%s, %s, %s)",
                           (recipe_id, step_number, instruction.strip()))

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

        # Check if the current user owns the recipe
        cursor.execute("SELECT UserID FROM recipes WHERE RecipeID = %s", (recipe_id,))
        result = cursor.fetchone()
        if not result or result[0] != current_user.id:
            return jsonify({'success': False, 'message': 'You do not have permission to delete this recipe.'}), 403

        # Delete the recipe and associated data
        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))
        cursor.execute("DELETE FROM recipes WHERE RecipeID = %s", (recipe_id,))

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
def update_recipe(recipe_id):
    data = request.get_json()
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    updated_tags = [tag.strip() for tag in data.get('tags')]  # Handle tags as a list
    servings = data.get('servings')
    origin = data.get('origin')
    is_favorite = data.get('is_favorite', False)
    password = data.get('password')

    if password != os.getenv('SECRET_PASSWORD'):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 403

    if not re.match(r'^\d+(-\d+)?$', servings):
        return jsonify({'success': False, 'message': 'Invalid format for servings. Use a number or a range like "8-10".'})

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        # Retrieve existing tags
        cursor.execute("""
            SELECT t.TagName FROM tags t
            JOIN recipetags rt ON t.TagID = rt.TagID
            WHERE rt.RecipeID = %s
        """, (recipe_id,))
        existing_tags = [row['TagName'] for row in cursor.fetchall()]
        logging.info(f"Existing tags: {existing_tags}")

        # Identify tags to be removed
        tags_to_remove = set(existing_tags) - set(updated_tags)
        logging.info(f"Tags to remove: {tags_to_remove}")

        # Update recipe details
        cursor.execute("""
            UPDATE recipes SET Title = %s, Servings = %s, Origin = %s, is_favorite = %s
            WHERE RecipeID = %s
        """, (title, servings, origin, is_favorite, recipe_id))

        # Delete existing ingredients and insert updated ones
        cursor.execute("DELETE FROM ingredients WHERE RecipeID = %s", (recipe_id,))
        for ingredient in ingredients:
            cursor.execute("INSERT INTO ingredients (RecipeID, Description) VALUES (%s, %s)", (recipe_id, ingredient.strip()))

        # Delete existing instructions and insert updated ones
        cursor.execute("DELETE FROM instructions WHERE RecipeID = %s", (recipe_id,))
        for step_number, instruction in enumerate(instructions, start=1):
            cursor.execute("INSERT INTO instructions (RecipeID, StepNumber, Description) VALUES (%s, %s, %s)", 
                           (recipe_id, step_number, instruction.strip()))

        # Delete existing tag associations
        cursor.execute("DELETE FROM recipetags WHERE RecipeID = %s", (recipe_id,))

        # Insert updated tag associations
        for tag in updated_tags:
            cursor.execute("SELECT TagID FROM tags WHERE TagName = %s", (tag,))
            tag_id = cursor.fetchone()
            if tag_id is None:
                cursor.execute("INSERT INTO tags (TagName) VALUES (%s)", (tag,))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag_id['TagID']
            cursor.execute("INSERT INTO recipetags (RecipeID, TagID) VALUES (%s, %s)", (recipe_id, tag_id))

        # Cleanup orphaned tags
        for tag in tags_to_remove:
            cursor.execute("""
                DELETE FROM tags
                WHERE TagName = %s
                AND TagID NOT IN (SELECT TagID FROM recipetags)
            """, (tag,))

        connection.commit()
        logging.info("Recipe updated successfully")
        return jsonify({'success': True, 'message': 'Recipe updated successfully!'})
    except Error as e:
        logging.error(f"Error while updating recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the recipe.'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/favorites', methods=['GET'])
def get_favorites():
    result = []
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM recipes WHERE is_favorite = TRUE")
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
def update_favorite(recipe_id):
    data = request.json
    is_favorite = data.get('is_favorite', False)

    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE recipes SET is_favorite = %s WHERE RecipeID = %s", (is_favorite, recipe_id))
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

# Authentication configuration
login_manager = LoginManager()
login_manager.init_app(app)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", None)
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", None)
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

client = WebApplicationClient(GOOGLE_CLIENT_ID)

class User(UserMixin):
    def __init__(self, id, email, name):
        self.id = id
        self.email = email
        self.name = name

    @staticmethod
    def get(user_id):
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        if not user:
            return None
        return User(id=user['id'], email=user['email'], name=user['name'])

    @staticmethod
    def create(email, name, password=None):
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        if password:
            hashed_password = generate_password_hash(password)
            cursor.execute("INSERT INTO users (email, name, password) VALUES (%s, %s, %s)", (email, name, hashed_password))
        else:
            cursor.execute("INSERT INTO users (email, name) VALUES (%s, %s)", (email, name))
        user_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        return User(id=user_id, email=email, name=name)

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    remember = data.get("remember", False)

    connection = connection_pool.get_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if user and check_password_hash(user['password'], password):
        user_obj = User(id=user['id'], email=user['email'], name=user['name'])
        login_user(user_obj, remember=remember)
        return jsonify({"success": True, "name": user['name']})
    return jsonify({"success": False, "message": "Invalid email or password"}), 401

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"success": True})

@app.route("/google_login")
def google_login():
    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]

    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=request.base_url + "/callback",
        scope=["openid", "email", "profile"],
    )
    return jsonify({"auth_url": request_uri})

@app.route("/google_login/callback", methods=["POST"])
def google_callback():
    id_token = request.json.get("id_token")
    if not id_token:
        return jsonify({"success": False, "message": "Missing ID token"}), 400

    # Verify the token
    try:
    idinfo = id_token.verify_oauth2_token(id_token, google_requests.Request(), GOOGLE_CLIENT_ID)
        if id_info['aud'] not in [GOOGLE_CLIENT_ID]:
            raise ValueError('Could not verify audience.')

        # Token is valid, extract user information
        unique_id = id_info["sub"]
        users_email = id_info["email"]
        users_name = id_info["name"]
    except ValueError as e:
        return jsonify({"success": False, "message": "Invalid token"}), 400

    # Check if user exists
    user = User.get(unique_id)
    if not user:
        # Create a new user if they don't exist
        user = User.create(users_email, users_name, unique_id)

    # Log in the user
    login_user(user)
    return jsonify({"success": True, "name": user.name})

    def handle_database_error(e, operation):
    print(f"Error during {operation}: {e}")
    return jsonify({'success': False, 'message': f'An error occurred during {operation}.'}), 500

@app.route('/some_route', methods=['GET'])
def some_route():
    connection = None
    cursor = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        # ... your database operations ...
        return jsonify({'success': True, 'data': result})
    except Error as e:
        return handle_database_error(e, 'fetching data')
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/check_login')
def check_login():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True})
    else:
        return jsonify({'logged_in': False})
        
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
