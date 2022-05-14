package main

import (
	"fmt"
	"net/http"
	"os"
	"sam-golang/graph"
	"sam-golang/graph/generated"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/guregu/dynamo"
)

func main() {
	db := dynamo.New(session.Must(session.NewSession()), aws.NewConfig().WithRegion("ap-northeast-1"))
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: &graph.Resolver{DB: db}}))

	path := "/query"
	envPrefix := os.Getenv("ENV_PREFIX")
	if envPrefix != "" {
		path = "/" + envPrefix + path
	}

	http.Handle("/", playground.Handler("GraphQL playground", path))
	http.Handle("/query", srv)

	fmt.Println(http.DefaultServeMux)

	lambda.Start(httpadapter.New(http.DefaultServeMux).ProxyWithContext)
}
