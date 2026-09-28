process.env.NODE_ENV = "test";
process.env.SECRET_KEY ||= "test-secret";
delete process.env.MONGO_URI;
process.env.MONGO_DB = `joinclub_test_${process.pid}`;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.SMTP_HOST;

import request from "supertest";
import { startTestDb } from "../tests/helpers/testDb.js";
import connectDB from "../utils/db.js";
import app from "../app.js";

const H = { "X-Requested-With": "XMLHttpRequest" };
const { uri, stop } = await startTestDb();
await connectDB(uri);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const reg = await request(app)
  .post("/api/v1/auth/register")
  .set(H)
  .field("fullname", "Pic Tester")
  .field("email", "pic@test.dev")
  .field("password", "Abcdefg1")
  .attach("file", png, { filename: "me.png", contentType: "image/png" });
console.log("with contentType ->", reg.status, JSON.stringify(reg.body).slice(0, 120));

const reg2 = await request(app)
  .post("/api/v1/auth/register")
  .set(H)
  .field("fullname", "Pic Tester 2")
  .field("email", "pic2@test.dev")
  .field("password", "Abcdefg1")
  .attach("file", png, "me.png");
console.log("without contentType ->", reg2.status, JSON.stringify(reg2.body).slice(0, 120));

process.exit(0);
