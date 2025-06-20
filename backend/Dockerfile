# Use the official Go image for building the application
FROM golang:1.24.3 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the go.mod and go.sum files to download dependencies
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go application for Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o /go-backend ./cmd/server/main.go

# Use a minimal image for the final stage
FROM alpine:latest

# Install ca-certificates for HTTPS connections (e.g., to MongoDB Atlas)
RUN apk --no-cache add ca-certificates

# Set the working directory
WORKDIR /root/

# Copy the compiled executable from the builder stage
COPY --from=builder /go-backend .

# Expose port 8080, as used by the Go backend
EXPOSE 8080

# Command to run the executable
CMD ["/root/go-backend"] 