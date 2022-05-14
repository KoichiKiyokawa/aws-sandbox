package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sam-golang/graph"
	"sam-golang/graph/generated"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

const defaultPort = "3000"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: &graph.Resolver{}}))

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", srv)

	fmt.Println(http.DefaultServeMux)

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	lambda.Start(httpadapter.New(http.DefaultServeMux).ProxyWithContext)
}
