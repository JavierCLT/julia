# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create a directory for the app
WORKDIR /code

# Copy requirements.txt
COPY requirements.txt /code/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . /code/

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables for Flask
ENV FLASK_APP=code.app

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "code.app:app"]
