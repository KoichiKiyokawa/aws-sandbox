FROM golang:1.18 AS builder
WORKDIR /go/app
COPY . .
RUN GCO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app

FROM alpine:latest
COPY --from=builder /go/app/app .
CMD ["./app"]