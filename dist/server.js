import fastify from "fastify";
import "dotenv/config";
import { proxyRequest } from "./core/proxy.js";
const app = fastify({
    disableRequestLogging: true,
    trustProxy: true,
});
app.removeAllContentTypeParsers();
app.addContentTypeParser("*", (req, payload, done) => {
    done(null, payload);
});
const PORT = Number(process.env.PORT) || 4000;
const TARGET = "http://127.0.0.1:4001";
app.all("*", async (req, res) => {
    await proxyRequest(req, res, TARGET);
});
app.listen({ port: PORT }, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    console.log(`Server started on ${address}`);
});
