from flask import Flask, request, jsonify, render_template
import mysql.connector
from mysql.connector import Error
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/search*": {"origins": "*"}})

db_config = {
    'host': os.environ.get('DB_HOST', 'default_host'),
    'user': os.environ.get('DB_USER', 'default_user'),
    'password': os.environ.get('DB_PASSWORD', 'default_password'),
    'database': os.environ.get('DB_NAME', 'default_db'),
    'port': int(os.environ.get('DB_PORT', 3306))
}

@app.route('/robots.txt')
def robots_txt():
    return send_from_directory(app.static_folder, 'robots.txt')

@app.route('/sitemap.xml')
def sitemap_xml():
    return send_from_directory(app.static_folder, 'sitemap.xml')
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search_foods():
    query_param = request.args.get('query')
    result = []

    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT id, title
        FROM foods
        WHERE title LIKE %s
        """
        like_pattern = f"%{query_param}%"
        cursor.execute(query, (like_pattern,))
        result = cursor.fetchall()
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        result = []
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify(result)

@app.route('/recipe_details/<int:id>', methods=['GET'])
def food_details(id):
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT f.title AS title, e.explanation AS explanation
            FROM foods f
            INNER JOIN explanations e ON f.id = e.food_id
            WHERE f.id = %s
        """, (id,))
        details = cursor.fetchone()
    except mysql.connector.Error as e:
        print(f"Error fetching food details: {e}")
        details = {}
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify(details)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
