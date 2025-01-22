module.exports = {
  apps: [
    {
      name: 'call-assistant-web',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    },
    {
      name: 'call-assistant-webhook',
      script: 'src/server/webhook.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3001'
      }
    }
  ]
}