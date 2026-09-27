import http from 'http';

const PORT = process.env.PORT || 8000;
const ROBOFLOW_API_KEY = process.env.VITE_ROBOFLOW_API_KEY || '';
const WORKSPACE = process.env.VITE_ROBOFLOW_WORKSPACE_NAME || 'new-workspace-mwiwl';
const WORKFLOW_ID = process.env.VITE_ROBOFLOW_WORKFLOW_ID || 'ngee-pen-vngee-pen-2-rfdetr-nas-base-t1-6d8aeb-logic';
const SERVERLESS_URL = 'https://serverless.roboflow.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Bright Dental Roboflow Proxy' }));
    return;
  }

  // Handle workflow inference request
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyBuffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        let imagePayload = null;

        if (contentType.includes('application/json')) {
          const parsed = JSON.parse(bodyBuffer.toString('utf-8'));
          imagePayload = parsed.inputs?.image || parsed.image;
        } else {
          imagePayload = {
            type: 'base64',
            value: bodyBuffer.toString('base64'),
          };
        }

        const roboflowEndpoint = `${SERVERLESS_URL}/${WORKSPACE}/workflows/${WORKFLOW_ID}`;

        const rfResponse = await fetch(roboflowEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ROBOFLOW_API_KEY}`,
          },
          body: JSON.stringify({
            inputs: {
              image: imagePayload,
            },
          }),
        });

        const rfData = await rfResponse.json();

        res.writeHead(rfResponse.status, {
          ...corsHeaders,
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(rfData));
      } catch (err) {
        console.error('[Proxy Error]', err);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, corsHeaders);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[Proxy] Server listening on port ${PORT}`);
});
