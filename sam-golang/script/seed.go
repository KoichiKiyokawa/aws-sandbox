package main

import (
	"sam-golang/graph/model"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/guregu/dynamo"
)

func main() {
	db := dynamo.New(session.Must(session.NewSession()), aws.NewConfig().WithRegion("ap-northeast-1"))

	err := db.Table("Todo").Put(&model.Todo{
		ID:   "1",
		Text: "Hello",
		Done: false,
	}).Run()
	if err != nil {
		panic(err)
	}
}
