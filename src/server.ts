import fastify from "fastify";
import "dotenv/config"


const app = fastify({
    logger: true,
});
const PORT: number = Number(process.env.PORT) || 4000;

app.listen({port: PORT}, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Server started on ${address}`);
})
