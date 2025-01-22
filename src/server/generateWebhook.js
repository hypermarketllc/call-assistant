import ngrok from 'ngrok';
import { spawn } from 'child_process';

async function startWebhookServer() {
  // Start the webhook server
  const server = spawn('node', ['src/server/webhook.js'], {
    stdio: 'inherit'
  });

  // Handle server process events
  server.on('error', (err) => {
    console.error('Failed to start webhook server:', err);
    process.exit(1);
  });

  return server;
}

async function createTunnel() {
  try {
    // Start ngrok tunnel
    const url = await ngrok.connect({
      addr: 3000,
      authtoken: process.env.NGROK_AUTH_TOKEN
    });

    console.log('\n=== Webhook URL Generated ===');
    console.log(`\nWebhook URL: ${url}/webhook`);
    console.log('\nUse this URL in your JustCall webhook configuration');
    console.log('\nPress Ctrl+C to stop the webhook server and tunnel\n');

    return url;
  } catch (err) {
    console.error('Failed to create ngrok tunnel:', err);
    process.exit(1);
  }
}

async function main() {
  // Start webhook server
  const server = await startWebhookServer();

  // Create ngrok tunnel
  const tunnelUrl = await createTunnel();

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await ngrok.kill();
    server.kill();
    process.exit(0);
  });
}

main().catch(console.error);