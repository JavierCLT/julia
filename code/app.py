from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, create_refresh_token, get_jwt_identity, get_jwt
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from marshmallow import Schema, fields, ValidationError
import os
import logging
from datetime import timedelta
import pymysql
from sqlalchemy import or_

pymysql.install_as_MySQLdb()

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
app.config['JWT_BLOCKLIST_ENABLED'] = True
app.config['JWT_BLOCKLIST_TOKEN_CHECKS'] = ['access', 'refresh']

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"]}})

# Set up logging
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s:%(levelname)s:%(message)s')

# Token blacklist set
blacklist = set()

@app.route('/test_db')
def test_db():
    try:
        # Test a simple query
        result = db.engine.execute('SELECT 1')
        return jsonify({"message": "Database connection is working"}), 200
    except Exception as e:
        app.logger.error(f"Database connection test failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Database connection failed"}), 500
      
# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    recipes = db.relationship('Recipe', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    ingredients = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text, nullable=False)
    servings = db.Column(db.String(20))
    origin = db.Column(db.String(100))
    is_favorite = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags = db.relationship('Tag', secondary='recipe_tags', lazy='subquery', backref=db.backref('recipes', lazy=True))

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

recipe_tags = db.Table('recipe_tags',
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

# Schemas for validation
class RecipeSchema(Schema):
    title = fields.Str(required=True)
    ingredients = fields.Str(required=True)
    instructions = fields.Str(required=True)
    tags = fields.List(fields.Str())
    servings = fields.Str()
    origin = fields.Str()
    is_favorite = fields.Bool()

# JWT token blacklist check
@jwt.token_in_blocklist_loader
def check_if_token_in_blacklist(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in blacklist

# Error handler
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Unhandled exception: {str(e)}")
    return jsonify({"message": "An unexpected error occurred"}), 500

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.json.get('username', None)
    password = request.json.get('password', None)
    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 400
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username', None)
    password = request.json.get('password', None)
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        access_token = create_access_token(identity=username)
        refresh_token = create_refresh_token(identity=username)
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200
    return jsonify({"message": "Bad username or password"}), 401

@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_token = create_access_token(identity=current_user)
    return jsonify({'access_token': new_token}), 200

@app.route('/logout', methods=['POST'])
def logout():
    jti = get_jwt()['jti']
    blacklist.add(jti)
    return jsonify({"message": "Successfully logged out"}), 200

@app.route('/search', methods=['GET'])
def search_recipes():
    try:
        query = request.args.get('query', '')
        app.logger.info(f"Search query: {query}")
        
        # Ensure the database connection is established
        if db.session.bind is None:
            db.session.bind = db.engine

        recipes = Recipe.query.filter(
            or_(
                Recipe.title.ilike(f'%{query}%'),
                Recipe.ingredients.ilike(f'%{query}%'),
                Recipe.instructions.ilike(f'%{query}%')
            )
        ).all()
        
        app.logger.info(f"Found {len(recipes)} recipes")
        result = [{'id': r.id, 'title': r.title} for r in recipes]
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error in search_recipes: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/recipe_details/<int:recipe_id>', methods=['GET'])
def recipe_details(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    return jsonify({
        'title': recipe.title,
        'ingredients': recipe.ingredients.split('\n'),
        'instructions': recipe.instructions.split('\n'),
        'servings': recipe.servings,
        'origin': recipe.origin,
        'is_favorite': recipe.is_favorite,
        'tags': [tag.name for tag in recipe.tags]
    })

@app.route('/add_recipe', methods=['POST'])
def add_recipe():
    try:
        schema = RecipeSchema()
        data = schema.load(request.json)
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        new_recipe = Recipe(
            title=data['title'],
            ingredients='\n'.join(data['ingredients']),
            instructions='\n'.join(data['instructions']),
            servings=data.get('servings'),
            origin=data.get('origin'),
            is_favorite=data.get('is_favorite', False),
            user_id=current_user.id
        )
        for tag_name in data.get('tags', []):
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
            new_recipe.tags.append(tag)
        db.session.add(new_recipe)
        db.session.commit()
        logging.info(f"Recipe '{new_recipe.title}' added successfully")
        return jsonify({'success': True, 'message': 'Recipe added successfully!'}), 201
    except ValidationError as err:
        logging.error(f"Validation error while adding recipe: {err.messages}")
        return jsonify(err.messages), 400
    except Exception as e:
        logging.error(f"Error while adding recipe: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while adding the recipe.'}), 500

@app.route('/update_recipe/<int:recipe_id>', methods=['PUT'])
def update_recipe(recipe_id):
    try:
        schema = RecipeSchema()
        data = schema.load(request.json)
        recipe = Recipe.query.get_or_404(recipe_id)
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        if recipe.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        recipe.title = data['title']
        recipe.ingredients = '\n'.join(data['ingredients'])
        recipe.instructions = '\n'.join(data['instructions'])
        recipe.servings = data.get('servings')
        recipe.origin = data.get('origin')
        recipe.is_favorite = data.get('is_favorite', False)
        recipe.tags = []
        for tag_name in data.get('tags', []):
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
            recipe.tags.append(tag)
        db.session.commit()
        logging.info(f"Recipe '{recipe.title}' updated successfully")
        return jsonify({'success': True, 'message': 'Recipe updated successfully!'}), 200
    except ValidationError as err:
        logging.error(f"Validation error while updating recipe: {err.messages}")
        return jsonify(err.messages), 400
    except Exception as e:
        logging.error(f"Error while updating recipe: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the recipe.'}), 500

@app.route('/delete_recipe/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        if recipe.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        db.session.delete(recipe)
        db.session.commit()
        logging.info(f"Recipe '{recipe.title}' deleted successfully")
        return jsonify({'success': True, 'message': 'Recipe deleted successfully!'}), 200
    except Exception as e:
        logging.error(f"Error while deleting recipe: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the recipe.'}), 500

@app.route('/favorites', methods=['GET'])
def get_favorites():
    current_user = User.query.filter_by(username=get_jwt_identity()).first()
    favorites = Recipe.query.filter_by(user_id=current_user.id, is_favorite=True).all()
    return jsonify([{'id': r.id, 'title': r.title} for r in favorites])

@app.route('/tags', methods=['GET'])
def get_tags():
    tags = Tag.query.all()
    return jsonify([tag.name for tag in tags])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
