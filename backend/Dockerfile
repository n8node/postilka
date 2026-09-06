# syntax=docker/dockerfile:1

ARG ALPINE_MIRROR=https://mirror.yandex.ru/mirrors/alpine

FROM golang:1.24-alpine AS builder
ARG ALPINE_MIRROR
WORKDIR /app
RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories \
    && apk add --no-cache git ca-certificates

ENV GOPROXY=https://proxy.golang.org,https://goproxy.io,direct

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /generation-worker ./cmd/generation-worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /publisher-worker ./cmd/publisher-worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /notification-worker ./cmd/notification-worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /maintenance-worker ./cmd/maintenance-worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /backup-worker ./cmd/backup-worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /create-superadmin ./cmd/create-superadmin
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /import-trends ./cmd/import-trends
RUN CGO_ENABLED=0 GOOS=linux GOBIN=/go/bin go install github.com/pressly/goose/v3/cmd/goose@v3.24.1

FROM alpine:3.20
ARG ALPINE_MIRROR
# MAX Bot API (platform-api2.max.ru) uses TLS chains signed by Russian Trusted CA (MinDigital).
RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories \
    && apk add --no-cache ca-certificates tzdata wget ffmpeg libwebp-tools \
        postgresql-client docker-cli \
    && wget -q -O /usr/local/share/ca-certificates/russian_trusted_root_ca.crt \
        https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt \
    && wget -q -O /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt \
        https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt \
    && update-ca-certificates
WORKDIR /app
COPY --from=builder /server /app/server
COPY --from=builder /worker /app/worker
COPY --from=builder /generation-worker /app/generation-worker
COPY --from=builder /publisher-worker /app/publisher-worker
COPY --from=builder /notification-worker /app/notification-worker
COPY --from=builder /maintenance-worker /app/maintenance-worker
COPY --from=builder /backup-worker /app/backup-worker
COPY --from=builder /create-superadmin /app/create-superadmin
COPY --from=builder /import-trends /app/import-trends
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY migrations ./migrations

ENV SERVER_PORT=8080
EXPOSE 8080
CMD ["/app/server"]
