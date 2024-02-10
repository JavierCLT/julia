from flask import Flask, request, jsonify, render_template
import mysql.connector
from mysql.connector import Error
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/search*": {"origins": "*"}})  # Adjust as needed for production

# Environment variables are used here for security reasons
db_config = {
    'host': os.environ.get('DB_HOST', 'default_host'),
    'user': os.environ.get('DB_USER', 'default_user'),
    'password': os.environ.get('DB_PASSWORD', 'default_password'),
    'database': os.environ.get('DB_NAME', 'default_db'),
    'port': int(os.environ.get('DB_PORT', 3306))  # Default to 3306 if not specified
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
        SELECT id, title
        FROM foods
        WHERE Title LIKE %s
        """
        like_pattern = f"%{query_param}%"
        cursor.execute(query, (like_pattern,))
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
def explanation_details(recipe_id):
    # Connect to the database and retrieve details
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor(dictionary=True)

    print(f"Executing query with recipe_id: {recipe_id}")

    # Fetch explanation
    cursor.execute("""
        SELECT explanation
        FROM foods
        WHERE id = %s
    """, (recipe_id,))
    explanation = cursor.fetchall()

    # Close connection
    cursor.close()
    connection.close()

    # Combine data into one response
    details = {
        'explanation': explanation,
    }

    return jsonify(details)

if __name__ == '__main__':
    app.run(debug=True, port=5001)


