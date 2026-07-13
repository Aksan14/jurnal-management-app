package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/asan14/jurnal-apps-backend/internal/service"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// JWTAuthMiddleware parses JWT token and sets claims in context
func JWTAuthMiddleware(cfg *config.Config) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing Authorization header")
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid Authorization format")
			}

			tokenStr := parts[1]
			claims := &service.JWTClaims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired token")
			}

			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Set("role", claims.Role)

			return next(c)
		}
	}
}

// RBACMiddleware checks if user has one of the allowed roles
func RBACMiddleware(allowedRoles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userRoleVal := c.Get("role")
			if userRoleVal == nil {
				return echo.NewHTTPError(http.StatusForbidden, "Access denied")
			}

			userRole := userRoleVal.(string)

			// Super Admin bypasses RBAC check for convenience
			if userRole == "super_admin" {
				return next(c)
			}

			for _, role := range allowedRoles {
				if userRole == role {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusForbidden, "You do not have permission to access this resource")
		}
	}
}

// GetCurrentUser retrieves user details from context
func GetCurrentUser(c echo.Context) (uint, string, error) {
	idVal := c.Get("user_id")
	roleVal := c.Get("role")
	if idVal == nil || roleVal == nil {
		return 0, "", errors.New("unauthorized")
	}
	return idVal.(uint), roleVal.(string), nil
}
