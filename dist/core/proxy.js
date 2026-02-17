import * as http from "http";
import * as https from "https";
import { pipeline } from "stream";
const AGENT_CONFIG = {
    keepAlive: true,
    maxSockets: 512,
    maxFreeSockets: 64,
    keepAliveMsecs: 8000,
    scheduling: "lifo",
};
const httpAgent = new http.Agent(AGENT_CONFIG);
const httpsAgent = new https.Agent(AGENT_CONFIG);
const hopByHopReq = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
]);
const hopByHopRes = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
]);
const FORBIDDEN_REQ_HEADERS = new Set(["host", "content-length"]);
const targetCache = new Map();
function getTargetInfo(target) {
    let info = targetCache.get(target);
    if (info)
        return info;
    const url = new URL(target);
    const isHttps = url.protocol === "https:";
    info = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? "443" : "80"),
        host: url.host,
        agent: isHttps ? httpsAgent : httpAgent,
        request: isHttps ? https.request : http.request,
    };
    targetCache.set(target, info);
    return info;
}
function filterHeaders(src, skip) {
    const out = {};
    for (const key in src) {
        if (!skip.has(key)) {
            const v = src[key];
            if (v !== undefined)
                out[key] = v;
        }
    }
    return out;
}
export const proxyRequest = async (request, reply, target) => {
    const info = getTargetInfo(target);
    const headers = filterHeaders(request.headers, hopByHopReq);
    FORBIDDEN_REQ_HEADERS.forEach((key) => {
        delete headers[key];
    });
    headers["host"] = info.host;
    headers["x-forwarded-for"] = request.ip;
    headers["x-forwarded-proto"] = request.protocol;
    headers["x-forwarded-host"] = request.hostname;
    const options = {
        method: request.method,
        hostname: info.hostname,
        port: info.port,
        path: request.url,
        protocol: info.protocol,
        headers,
        agent: info.agent,
    };
    return new Promise((resolve, reject) => {
        const proxyReq = info.request(options, (proxyRes) => {
            const resHeaders = {};
            const rawResHeaders = proxyRes.headers;
            for (const key in rawResHeaders) {
                if (!hopByHopRes.has(key)) {
                    const v = rawResHeaders[key];
                    if (v !== undefined)
                        resHeaders[key] = v;
                }
            }
            const raw = reply.raw;
            raw.cork();
            raw.writeHead(proxyRes.statusCode || 500, resHeaders);
            process.nextTick(() => raw.uncork());
            pipeline(proxyRes, raw, (err) => {
                if (err) {
                    if (!raw.writableEnded)
                        raw.end();
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        proxyReq.setNoDelay(true);
        proxyReq.setTimeout(60000);
        let settled = false;
        const onProxyError = (err) => {
            if (settled)
                return;
            settled = true;
            proxyReq.destroy();
            reject(err);
        };
        const onTimeout = () => {
            if (settled)
                return;
            settled = true;
            proxyReq.destroy();
            reject(new Error("Gateway Timeout"));
        };
        proxyReq.on("error", onProxyError);
        proxyReq.on("timeout", onTimeout);
        const onAbort = () => {
            if (!proxyReq.destroyed)
                proxyReq.destroy();
        };
        request.raw.once("aborted", onAbort);
        proxyReq.once("close", () => {
            request.raw.removeListener("aborted", onAbort);
        });
        request.raw.pipe(proxyReq, { end: true });
    });
};
