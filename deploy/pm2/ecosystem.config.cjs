/**
 * PM2 Ecosystem Configuration for RCV Lunch Picker
 *
 * Process name: rcv-lunch
 * Port: 3100 (default)
 *
 * Usage:
 *   pm2 start deploy/pm2/ecosystem.config.cjs
 *   pm2 restart rcv-lunch
 *   pm2 logs rcv-lunch
 */

module.exports = {
  apps: [
    {
      name: 'rcv-lunch',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: process.env.RCV_APP_DIR || '/var/www/rcv-lunch',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        DATABASE_PATH: '/var/lib/rcv-lunch/rcv.sqlite',
      },
      // Logging
      error_file: '/var/log/rcv-lunch/error.log',
      out_file: '/var/log/rcv-lunch/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
