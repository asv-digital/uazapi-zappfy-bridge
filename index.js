require('dotenv').config()
const fastify = require('fastify')({ logger: true })

const { saveWebhook } = require('./uazapi');

const start = async () => {
    await fastify.register(require('@fastify/cors'), {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'token', 'admintoken'],
    });

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
                body: JSON.stringify(eventData),
                signal: AbortSignal.timeout(10000)
            });

            return { success: true };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Forwarding failed' });
        }
    });



    await fastify.register(require('@fastify/http-proxy'), {
        upstream: (process.env.TARGET_API_URL || '').replace(/\/$/, ''),
        prefix: '/',
        http2: false,
        httpMethods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'],
        preHandler: async (request, reply) => {
            fastify.log.info(`[PROXY] ${request.method} ${request.url} -> Upstream`);
            const url = request.raw.url.split('?')[0];
            if (request.method === 'GET' && url === '/') {
                return reply.code(200).send({
                    "status": 200,
                    "message": "Welcome to the Zappfy API, it is working!",
                    "version": "2.0.0",
                });
            }
        },
        replyOptions: {
            rewriteRequestHeaders: (originalReq, headers) => {
                return {
                    ...headers,
                    'token': originalReq.headers.token || headers.token,
                    'admintoken': originalReq.headers.admintoken || headers.admintoken,
                    'authorization': originalReq.headers.authorization || headers.authorization,
                };
            }
        },
        errorHandler: (error, request, reply) => {
            fastify.log.error({ msg: 'Upstream Proxy Error', error });
            reply.code(error.statusCode || 500).send(error);
        }
    })

    try {
        await fastify.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
