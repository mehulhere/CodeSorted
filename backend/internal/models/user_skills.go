package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SkillLevel represents the proficiency level for a skill
type SkillLevel string

const (
	SkillLevelBeginner     SkillLevel = "Beginner"
	SkillLevelIntermediate SkillLevel = "Intermediate"
	SkillLevelAdvanced     SkillLevel = "Advanced"
	SkillLevelExpert       SkillLevel = "Expert"
)

// UserSkill represents a user's proficiency in a specific problem-solving skill or topic
type UserSkill struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username       string             `json:"username" bson:"username"`
	SkillName      string             `json:"skill_name" bson:"skill_name"`
	Level          SkillLevel         `json:"level" bson:"level"`
	ProblemsSolved int                `json:"problems_solved" bson:"problems_solved"`
	EasyCount      int                `json:"easy_count" bson:"easy_count"`
	MediumCount    int                `json:"medium_count" bson:"medium_count"`
	HardCount      int                `json:"hard_count" bson:"hard_count"`
	LastPracticed  time.Time          `json:"last_practiced" bson:"last_practiced"`
}

// UserSkillsProfile represents a summary of all skills for a user
type UserSkillsProfile struct {
	UserID        primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username      string             `json:"username" bson:"username"`
	Skills        []UserSkill        `json:"skills" bson:"skills"`
	LastUpdatedAt time.Time          `json:"last_updated_at" bson:"last_updated_at"`
}
