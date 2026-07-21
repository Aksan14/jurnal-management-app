# ── Stage 1: Use pre-built static binary ─────────────────────────────────────
# Binary sudah di-build dengan: CGO_ENABLED=0 GOOS=linux go build -o server_static
FROM scratch AS binary-source
COPY server_static /server

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=binary-source /server ./server

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./server"]