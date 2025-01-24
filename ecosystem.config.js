module.exports = {
  apps: [
    {
      name: 'call-assistant-web',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'call-assistant-webhook',
      script: 'src/server/webhook.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3002'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};