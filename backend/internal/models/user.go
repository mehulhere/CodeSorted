package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	//Maps the default MongoDB id with json ID needed for frontend
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`

	// Other Fields

	Firstname string `bson:"firstname" json:"firstname"`
	Lastname  string `bson:"lastname" json:"lastname"`
	Username  string `bson:"username" json:"username"` // Must be unique

	Password string `bson:"password" json:"-"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
