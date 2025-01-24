export default {
  apps: [
    {
      name: 'call-assistant-web',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    },
    {
      name: 'call-assistant-proxy',
      script: './src/server/proxy.js',
      interpreter: 'node',
      interpreter_args: '--experimental-modules --es-module-specifier-resolution=node',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        PROXY_PORT: '3004'
      }
    },
    {
      name: 'call-assistant-webhook',
      script: './src/server/webhook.js',
      interpreter: 'node',
      interpreter_args: '--experimental-modules --es-module-specifier-resolution=node',
      env: {
        NODE_ENV: 'production',
        PORT: '3003'
      }
    }
  ]
};