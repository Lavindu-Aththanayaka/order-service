const request = require("supertest");
const app = require("../server");

describe("order-service", () => {
  it("GET /health returns 200 and ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /orders without items returns 400", async () => {
    const res = await request(app).post("/orders").send({ userId: "u1" });
    expect(res.statusCode).toBe(400);
  });
});
