import http from "http";
import https from "https";
import {FastifyRequest, FastifyReply} from "fastify";
import {ClientRequest, IncomingMessage} from "node:http";


const httpAgent = new http.Agent({
    keepAlive: true,
    timeout: 30000,
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    timeout: 30000,
});

export const proxyRequest = (req: FastifyRequest, res: FastifyReply, target: string) => {
    try {
        const targetUrl = new URL(req.url);
        const isHttps: boolean = targetUrl.protocol === "https";

        const headers = {...req.headers};
        delete headers["host"];
        delete headers["content-length"];

        const options: http.RequestOptions = {
            method: req.method,
            path: req.url,
            hostname: targetUrl.hostname,
            protocol: targetUrl.protocol,
            headers: req.headers,
            agent: isHttps ? httpsAgent : httpAgent,
            port: targetUrl.port,
            timeout: 5000
        }

        const proxyReq: ClientRequest = (isHttps ? https : http).request(options, (proxyRes: IncomingMessage) => {
            res.raw.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

            proxyRes.pipe(res.raw, {
                end: true
            });
        });

        proxyReq.on("error", (err) => {
            req.log.error(err);
            res.status(502).send({error: "Bad Gateway"});
        });
        proxyReq.on("timeout", () => {
            proxyReq.destroy();
            res.status(504).send({error: "Gateway Timeout"});
        });
        if (req.raw.readable) {
            req.raw.pipe(proxyReq, {end: true});
        } else {
            proxyReq.end();
        }
    } catch (error) {
        req.log.error(error);
        res.status(500).send({error: "Proxy Error"});
    }

}


