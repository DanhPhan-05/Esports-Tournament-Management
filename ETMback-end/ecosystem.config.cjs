module.exports = {
  apps: [
    {
      name: "etm-api",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      env: { NODE_ENV: "production" }
    }
  ]
};
