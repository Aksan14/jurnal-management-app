// PM2 Ecosystem Config – Next.js Frontend
module.exports = {
  apps: [
    {
      name: "jurnal-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/ubuntu/jurnal-management-app/frontend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
