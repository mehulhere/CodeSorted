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
	Email     string `bson:"email" json:"email"`
	Password  string `bson:"password" json:"-"`
	IsAdmin   bool   `bson:"is_admin" json:"is_admin"` // Flag to identify admin users

	// OAuth fields
	OAuthProvider  string `bson:"oauth_provider,omitempty" json:"oauth_provider,omitempty"`
	OAuthID        string `bson:"oauth_id,omitempty" json:"oauth_id,omitempty"`
	ProfilePicture string `bson:"profile_picture,omitempty" json:"profile_picture,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
