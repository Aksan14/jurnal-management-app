package main

import (
	"log"

	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/asan14/jurnal-apps-backend/internal/validator"
	"github.com/asan14/jurnal-apps-backend/pkg/database"
	"github.com/asan14/jurnal-apps-backend/routes"
	"github.com/labstack/echo/v4"
	eMiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	log.Println("Starting Jurnal Apps Backend...")

	// Load configuration
	cfg := config.LoadConfig(".env")

	// Initialize Database (AutoMigrate & Seed on empty DB)
	db := database.InitDB(cfg)

	// Initialize Redis (optional — skipped if REDIS_ADDR not set)
	rdb := database.InitRedis(cfg)
	if rdb != nil {
		defer rdb.Close()
	}

	// Create Echo Instance
	e := echo.New()

	// Global Middlewares
	e.Use(eMiddleware.Logger())
	e.Use(eMiddleware.Recover())
	e.Use(eMiddleware.CORSWithConfig(eMiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE, echo.OPTIONS},
	}))
	e.Use(eMiddleware.Secure())

	// Custom request validator
	e.Validator = validator.NewCustomValidator()

	// Setup API Routes
	routes.SetupRoutes(e, db, cfg, rdb)

	// Start Echo HTTP server
	port := cfg.Port
	log.Printf("Server starting on port %s", port)
	if err := e.Start(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
