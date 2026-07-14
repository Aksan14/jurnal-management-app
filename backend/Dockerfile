# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build deps
RUN apk add --no-cache git ca-certificates tzdata

# Download dependencies first (cache layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o server ./cmd/api/main.go

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

# Runtime deps
RUN apk add --no-cache ca-certificates tzdata

# Copy binary and assets from builder
COPY --from=builder /app/server .
COPY --from=builder /app/uploads ./uploads

# Create uploads sub-directories
RUN mkdir -p uploads/bukti uploads/foto uploads/perizinan uploads/prestasi uploads/psikotes

EXPOSE 8080

CMD ["./server"]
