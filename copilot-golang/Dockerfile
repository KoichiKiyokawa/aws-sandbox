FROM golang:1.18 AS builder
WORKDIR /workdir
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app

FROM scratch
COPY --from=builder /workdir/app .
# HTTPSで通信を行うのに必要
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
CMD ["./app"]