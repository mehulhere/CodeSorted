package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Profile struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID   primitive.ObjectID `bson:"userId" json:"userId"`
	Bio      string             `bson:"bio,omitempty" json:"bio,omitempty"`
	Location string             `bson:"location,omitempty" json:"location,omitempty"`
	Website  string             `bson:"website,omitempty" json:"website,omitempty"`
}
