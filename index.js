require('dotenv').config()
const fastify = require('fastify')({ logger: true })

fastify.register(require('@fastify/cors'))

fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.TARGET_API_URL,
    prefix: '/',
    http2: false,
    httpMethods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT']
})

const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
