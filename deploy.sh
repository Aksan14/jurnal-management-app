#!/usr/bin/env bash
# =============================================================================
# deploy.sh  –  Full deployment script for jurnal-management-app
# Usage  : bash deploy.sh
# Server : ubuntu@168.110.196.46
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/Aksan14/jurnal-management-app.git"
APP_DIR="/home/ubuntu/jurnal-management-app"
BRANCH="main"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── 1. System dependencies ──────────────────────────────────────────────────
info "Memperbarui paket sistem..."
sudo apt-get update -qq

# Docker
if ! command -v docker &>/dev/null; then
  info "Menginstall Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  warn "Docker baru diinstall. Jika perintah docker gagal, logout lalu login kembali dan jalankan ulang script ini."
else
  info "Docker sudah terinstall: $(docker --version)"
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  info "Menginstall Docker Compose plugin..."
  sudo apt-get install -y docker-compose-plugin
else
  info "Docker Compose sudah ada: $(docker compose version --short)"
fi

# Node.js 20 LTS
if ! command -v node &>/dev/null; then
  info "Menginstall Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js sudah terinstall: $(node --version)"
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  info "Menginstall PM2 secara global..."
  sudo npm install -g pm2
  pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
else
  info "PM2 sudah terinstall: $(pm2 --version)"
fi

# ─── 2. Clone / pull repository ──────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  info "Repository sudah ada – melakukan git pull..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
else
  info "Meng-clone repository..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── 3. Setup backend .env ───────────────────────────────────────────────────
BACKEND_ENV="$APP_DIR/backend/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  warn ".env backend tidak ditemukan – membuat dari .env.example"
  cp "$APP_DIR/backend/.env.example" "$BACKEND_ENV"
  warn ">>> EDIT $BACKEND_ENV dan isi nilai DB_PASSWORD, JWT_SECRET, SMTP_* sebelum lanjut <<<"
  warn "Jalankan: nano $BACKEND_ENV"
  read -rp "Tekan ENTER setelah selesai mengisi .env backend..." _
fi

# Pastikan DB_HOST di .env sudah mengarah ke service 'db' (bukan localhost)
sed -i 's/^DB_HOST=localhost/DB_HOST=db/' "$BACKEND_ENV"

# ─── 4. Setup frontend .env ──────────────────────────────────────────────────
FRONTEND_ENV="$APP_DIR/frontend/.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
  info "Membuat .env.local frontend..."
  cp "$APP_DIR/frontend/.env.example" "$FRONTEND_ENV"
  # Set default API URL ke IP server ini
  SERVER_IP=$(curl -s ifconfig.me || echo "168.110.196.46")
  sed -i "s|http://168.110.196.46:8080|http://${SERVER_IP}:8080|" "$FRONTEND_ENV"
  info "NEXT_PUBLIC_API_URL diset ke: http://${SERVER_IP}:8080/api/v1"
fi

# ─── 5. Build & start backend (Docker) ───────────────────────────────────────
info "Membangun dan menjalankan backend + MySQL via Docker Compose..."
cd "$APP_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache backend
docker compose up -d

info "Menunggu backend sehat..."
timeout=60
elapsed=0
until curl -sf http://localhost:8080/health &>/dev/null || curl -sf http://localhost:8080/api/v1/health &>/dev/null; do
  sleep 3
  elapsed=$((elapsed + 3))
  if [ $elapsed -ge $timeout ]; then
    warn "Backend belum merespons setelah ${timeout}s – lanjutkan..."
    break
  fi
done

# ─── 6. Build & start frontend (PM2) ─────────────────────────────────────────
info "Menginstall dependensi frontend..."
cd "$APP_DIR/frontend"
npm ci --prefer-offline

info "Membangun Next.js..."
npm run build

info "Menjalankan frontend dengan PM2..."
pm2 delete jurnal-frontend 2>/dev/null || true
pm2 start "$APP_DIR/frontend/ecosystem.config.js"
pm2 save

# ─── 7. Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment selesai!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "168.110.196.46")
echo -e "  Backend  : http://${SERVER_IP}:8080"
echo -e "  Frontend : http://${SERVER_IP}:3000"
echo ""
echo -e "  Cek log backend  : ${YELLOW}docker compose logs -f backend${NC}"
echo -e "  Cek log frontend : ${YELLOW}pm2 logs jurnal-frontend${NC}"
echo -e "  Status PM2       : ${YELLOW}pm2 status${NC}"
echo -e "  Status Docker    : ${YELLOW}docker compose ps${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
