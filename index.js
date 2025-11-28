require('dotenv').config()
const fastify = require('fastify')({ logger: true })

fastify.register(require('@fastify/cors'))

const { saveWebhook } = require('./uazapi');


fastify.post('/webhook', async (request, reply) => {
    const token = request.headers.token;
    const originalBody = request.body;

    if (!originalBody.url) {
        return reply.code(400).send({ error: 'URL is required in body' });
    }

    const bridgeUrl = `${process.env.BRIDGE_URL}/webhook-bridge?target=${encodeURIComponent(originalBody.url)}`;

    const newBody = {
        ...originalBody,
        url: bridgeUrl
    };

    try {
        const result = await saveWebhook(newBody, token);
        return result;
    } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to save webhook upstream' });
    }
});


fastify.post('/webhook-bridge', async (request, reply) => {
    const { target } = request.query;

    if (!target) {
        return reply.code(400).send({ error: 'Target URL missing' });
    }

    const eventData = request.body;

    if (eventData.BaseUrl) {
        eventData.BaseUrl = process.env.CUSTOM_BASE_URL || eventData.BaseUrl;
    }

    try {
        await fetch(target, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });

        return { success: true };
    } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Forwarding failed' });
    }
});

fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.TARGET_API_URL,
    prefix: '/',
    http2: false,
    httpMethods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT']
})



const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
