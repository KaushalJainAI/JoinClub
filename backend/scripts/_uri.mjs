process.env.NODE_ENV = "test";
process.env.SECRET_KEY ||= "test-secret";
delete process.env.MONGO_URI;
process.env.MONGO_DB = "joinclub_test";

import mongoose from "mongoose";
import { startTestDb } from "../tests/helpers/testDb.js";
import connectDB from "../utils/db.js";

const { uri, stop } = await startTestDb();
console.log("PID          =", process.pid);
console.log("uri          =", uri);
console.log("MONGO_DB     =", process.env.MONGO_DB);
await connectDB(uri);
console.log("connected db =", mongoose.connection.name);
await mongoose.disconnect();
await stop();
process.exit(0);
