import fastify from "fastify";
import "dotenv/config"
import {proxyRequest} from "./core/proxy";


const app = fastify({
    logger: true,
});
const PORT: number = Number(process.env.PORT) || 4000;
const TARGET = "http://localhost:4001";

app.all("*", async (req, res) => {
    await proxyRequest(req, res, TARGET)
})

app.listen({port: PORT}, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Server started on ${address}`);
})
