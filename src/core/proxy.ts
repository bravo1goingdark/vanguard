import http, {ClientRequest, IncomingMessage} from "http";
import https from "https";
import {FastifyRequest, FastifyReply} from "fastify";


const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 100,
    timeout: 30000,
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    timeout: 30000,
});


const hopByHopHeaders = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
];

export const proxyRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
    target: string
) => {
    try {
        const targetUrl = new URL(target);
        const isHttps = targetUrl.protocol === "https:";

        const headers: Record<string, any> = {...request.headers};

        delete headers["host"];
        delete headers["content-length"];

        for (const header of hopByHopHeaders) {
            delete headers[header];
        }

        headers["x-forwarded-for"] = request.ip;
        headers["x-forwarded-proto"] = request.protocol;
        headers["x-forwarded-host"] = request.hostname;

        const options: http.RequestOptions = {
            method: request.method,
            hostname: targetUrl.hostname,
            port: targetUrl.port || (isHttps ? 443 : 80),
            path: request.url,
            protocol: targetUrl.protocol,
            headers,
            agent: isHttps ? httpsAgent : httpAgent,
            timeout: 5000,
        };

        const proxyReq: ClientRequest = (isHttps ? https : http).request(
            options,
            (proxyRes: IncomingMessage) => {
                if (!reply.raw.headersSent) {
                    reply.raw.writeHead(
                        proxyRes.statusCode || 500,
                        proxyRes.headers
                    );
                }

                proxyRes.pipe(reply.raw, {end: true});

                proxyRes.on("error", (err) => {
                    request.log.error(err);
                    if (!reply.raw.writableEnded) {
                        reply.raw.end();
                    }
                });
            }
        );


        proxyReq.on("error", (err) => {
            request.log.error(err);
            if (!reply.raw.writableEnded) {
                reply.status(502).send({error: "Bad Gateway"});
            }
        });
        proxyReq.on("timeout", () => {
            proxyReq.destroy();
            if (!reply.raw.writableEnded) {
                reply.status(504).send({error: "Gateway Timeout"});
            }
        });
        request.raw.on("aborted", () => {
            if (!proxyReq.destroyed) {
                proxyReq.destroy();
            }
        });

        if (request.raw.readable) {
            request.raw.pipe(proxyReq, {end: true});
        } else {
            proxyReq.end();
        }

    } catch (error) {
        request.log.error(error);
        if (!reply.raw.writableEnded) {
            reply.status(500).send({error: "Proxy Error"});
        }
    }
};
