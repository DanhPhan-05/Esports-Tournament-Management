module.exports = {
  apps: [{
    name: 'etm-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    max_restarts: 10,
    env: { NODE_ENV: 'production' },
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
  }],
};
