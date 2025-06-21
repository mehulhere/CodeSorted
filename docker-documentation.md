# Docker Documentation

This document contains information about Docker, focusing on Dockerfiles, Docker Compose, and container management.

## Dockerfile

A `Dockerfile` is a text document that contains all the commands a user could call on the command line to assemble an image.

**Example: A simple Dockerfile**
```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 80 available to the world outside this container
EXPOSE 80

# Define environment variable
ENV NAME World

# Run app.py when the container launches
CMD ["python", "app.py"]
```

## Docker Compose

Docker Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file to configure your application's services.

**Example: A simple `compose.yaml` file**
```yaml
services:
  web:
    build: .
    ports:
      - "8000:5000"
  redis:
    image: "redis:alpine"
```

### Common Commands
*   `docker compose up`: Create and start containers. Use the `--build` flag to build images before starting the containers.
*   `docker compose down`: Stop and remove containers, networks, images, and volumes.
*   `docker compose ps`: List containers.
*   `docker compose logs`: View output from containers.
*   `docker compose exec <service> <command>`: Execute a command in a running container.

## Container Management

### Listing Containers
To list all running containers:
```bash
docker ps
```
To list all containers (including stopped ones):
```bash
docker ps -a
```

### Stopping and Starting Containers
To stop a container:
```bash
docker stop <container_id_or_name>
```
To start a container:
```bash
docker start <container_id_or_name>
```

### Removing Containers
To remove a stopped container:
```bash
docker rm <container_id_or_name>
```
To remove a running container (forcefully):
```bash
docker rm -f <container_id_or_name>
``` 