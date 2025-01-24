export default {
  apps: [
    {
      name: 'call-assistant-web',
      script: 'npm',
      args: 'run start:web',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    },
    {
      name: 'call-assistant-proxy',
      script: 'npm',
      args: 'run start:proxy',
      env: {
        NODE_ENV: 'production',
        PORT: '3004',
        PROXY_PORT: '3004'
      }
    },
    {
      name: 'call-assistant-webhook',
      script: 'npm',
      args: 'run start:webhook',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        WS_PORT: '3003'
      }
    }
  ]
};