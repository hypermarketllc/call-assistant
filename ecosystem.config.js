export default {
  apps: [
    {
      name: 'call-assistant-web',
      script: 'npm',
      args: 'run preview',
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
        PORT: '3002'
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