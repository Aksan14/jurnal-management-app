package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/redis/go-redis/v9"
)

// InitRedis creates and verifies a Redis client connection.
// Returns nil if REDIS_ADDR is not configured (Redis is optional).
func InitRedis(cfg *config.Config) *redis.Client {
	if cfg.RedisAddr == "" {
		log.Println("Redis: REDIS_ADDR not set, skipping Redis initialization")
		return nil
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,

		// Connection pool settings
		PoolSize:     10,
		MinIdleConns: 3,
		MaxRetries:   3,

		// Timeouts
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Fatalf("Redis: failed to connect to %s — %v", cfg.RedisAddr, err)
	}

	log.Printf("Redis: connected to %s (db=%d)", cfg.RedisAddr, cfg.RedisDB)
	return rdb
}

// SetWithTTL stores a key-value pair with expiry.
func SetWithTTL(ctx context.Context, rdb *redis.Client, key string, val any, ttl time.Duration) error {
	if rdb == nil {
		return nil
	}
	return rdb.Set(ctx, key, val, ttl).Err()
}

// Get retrieves a value by key. Returns ("", nil) if key not found.
func Get(ctx context.Context, rdb *redis.Client, key string) (string, error) {
	if rdb == nil {
		return "", nil
	}
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	return val, err
}

// Del removes one or more keys.
func Del(ctx context.Context, rdb *redis.Client, keys ...string) error {
	if rdb == nil {
		return nil
	}
	return rdb.Del(ctx, keys...).Err()
}

// BlacklistToken stores a JWT token in the blacklist until its TTL expires.
// Used for logout / token revocation.
func BlacklistToken(ctx context.Context, rdb *redis.Client, token string, ttl time.Duration) error {
	key := fmt.Sprintf("blacklist:%s", token)
	return SetWithTTL(ctx, rdb, key, "1", ttl)
}

// IsTokenBlacklisted checks if a JWT token has been revoked.
func IsTokenBlacklisted(ctx context.Context, rdb *redis.Client, token string) bool {
	if rdb == nil {
		return false
	}
	key := fmt.Sprintf("blacklist:%s", token)
	val, _ := Get(ctx, rdb, key)
	return val == "1"
}
