import fastify from "fastify";
const PORT = 4001;
const app = fastify();
app.get("/api/users", async () => {
    return { users: ["Alice", "Bob"] };
});
app.post("/api/users", async (req) => {
    return { received: req.body };
});
app.get("/slow", async () => {
    await new Promise((r) => setTimeout(r, 10000));
    return { slow: true };
});
app.listen({ port: PORT }, () => {
    console.log("Mock service running on 4001");
});
