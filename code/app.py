@app.route('/update_recipe/<int:recipe_id>', methods=['POST'])
def update_recipe(recipe_id):
    data = request.json
    title = data.get('title')
    ingredients = data.get('ingredients').split('\n')
    instructions = data.get('instructions').split('\n')
    password = data.get('password')

    if password != os.getenv('SECRET_PASSWORD'):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 403

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        cursor.execute("UPDATE recipes SET Title = %s WHERE RecipeID = %s", (title, recipe_id))

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

        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error while updating recipe: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the recipe.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

    return jsonify({'success': True, 'message': 'Recipe updated successfully!'})
