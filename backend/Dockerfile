# syntax=docker/dockerfile:1

ARG ALPINE_MIRROR=https://mirror.yandex.ru/mirrors/alpine

FROM golang:1.23-alpine AS builder
ARG ALPINE_MIRROR
WORKDIR /app
RUN sed -i "s|https://dl-cdn.alpinelinux.org|${ALPINE_MIRROR}|g" /etc/apk/repositories \
    && apk add --no-cache git ca-certificates

ENV GOPROXY=https://proxy.golang.org,https://goproxy.io,direct

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux GOBIN=/go/bin go install github.com/pressly/goose/v3/cmd/goose@v3.24.1

FROM alpine:3.20
ARG ALPINE_MIRROR
RUN sed -i "s|https://dl-cdn.alpinelinux.org|${ALPINE_MIRROR}|g" /etc/apk/repositories \
    && apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server /app/server
COPY --from=builder /worker /app/worker
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY migrations ./migrations

ENV SERVER_PORT=8080
EXPOSE 8080
CMD ["/app/server"]
