import fastify from '../server.js';

const ready = fastify.ready();

export default async function handler(request, response) {
  await ready;

  // Vercel invokes /api after rewrites; route browser checks to / and Telegram POSTs to the webhook.
  const query = request.url?.includes('?')
    ? request.url.slice(request.url.indexOf('?'))
    : '';
  request.url = request.method === 'POST'
    ? '/webhook/telegram' + query
    : '/' + query;

  fastify.server.emit('request', request, response);
}
