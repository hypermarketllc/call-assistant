module.exports = {
  apps: [
    {
      name: "webhook-1",
      script: "src/server/webhook.js",
      watch: false,
      instances: 4,
      exec_mode: "cluster",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "call-assistant-web",
      script: "npm",
      args: "run dev",
      watch: false,
      max_memory_restart: "300M"
    }
  ]
};
