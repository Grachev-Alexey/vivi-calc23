// ============================================================
// PM2 — описание процесса "Энсо"
// Запуск:  pm2 start /var/www/enso/deploy/ecosystem.config.cjs
// ============================================================
module.exports = {
  apps: [
    {
      name: "enso-calc",
      cwd: "/var/www/enso",
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      max_memory_restart: "600M",
      env_file: "/var/www/enso/.env",
      env: {
        NODE_ENV: "production",
      },
      out_file: "/var/log/enso-calc/out.log",
      error_file: "/var/log/enso-calc/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
