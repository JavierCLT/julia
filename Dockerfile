# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Upgrade pip and install the dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Set environment variables
ENV FLASK_APP=code.app

# Expose the port the app runs on
EXPOSE 8080

# Run the Flask app
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "code.app:app"]
