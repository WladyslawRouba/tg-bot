import fastify from '../03/server.js';

const ready = fastify.ready();

export default async function handler(request, response) {
  await ready;

  const query = request.url?.includes('?')
    ? request.url.slice(request.url.indexOf('?'))
    : '';
  request.url = request.method === 'POST'
    ? '/webhook/telegram' + query
    : '/' + query;

  fastify.server.emit('request', request, response);
}
