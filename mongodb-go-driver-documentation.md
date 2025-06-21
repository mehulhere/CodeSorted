# MongoDB Go Driver Documentation

This document contains information about the MongoDB Go Driver, focusing on connecting to MongoDB, and performing CRUD operations.

## Connecting to MongoDB

To connect to a MongoDB instance, use `mongo.Connect`. You can configure the connection using `options.Client()`.

**Example: Connecting to MongoDB**
```go
import (
    "context"
    "time"

    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
    "go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

// Set client options
clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")

// Connect to MongoDB
client, err := mongo.Connect(context.TODO(), clientOptions)
if err != nil {
    log.Fatal(err)
}

// Check the connection
err = client.Ping(context.TODO(), nil)
if err != nil {
    log.Fatal(err)
}

fmt.Println("Connected to MongoDB!")
```

It is a good practice to disconnect from the client when the application is shutting down.

```go
defer func() {
    if err = client.Disconnect(ctx); err != nil {
        panic(err)
    }
}()
```

## CRUD Operations

### Getting a Collection
To perform operations on a collection, you first need to get a `Collection` instance from a `Database`.

```go
collection := client.Database("testing").Collection("numbers")
```

### Inserting Documents
You can insert a single document using `InsertOne` or multiple documents using `InsertMany`.

**Example: Inserting a single document**
```go
import "go.mongodb.org/mongo-driver/v2/bson"

res, err := collection.InsertOne(context.Background(), bson.D{{"name", "pi"}, {"value", 3.14159}})
if err != nil {
    log.Fatal(err)
}
id := res.InsertedID
```

### Finding Documents
You can find documents using `FindOne` to retrieve a single document or `Find` to retrieve multiple documents. `Find` returns a `Cursor`, which you can iterate over.

**Example: Finding a single document**
```go
var result struct {
    Value float64
}

filter := bson.D{{"name", "pi"}}
err = collection.FindOne(context.Background(), filter).Decode(&result)
if err != nil {
    log.Fatal(err)
}
```

**Example: Finding multiple documents**
```go
cur, err := collection.Find(context.Background(), bson.D{})
if err != nil {
    log.Fatal(err)
}
defer cur.Close(context.Background())

for cur.Next(context.Background()) {
    var result bson.D
    err := cur.Decode(&result)
    if err != nil {
        log.Fatal(err)
    }
    // do something with result
}

if err := cur.Err(); err != nil {
    log.Fatal(err)
}
``` 