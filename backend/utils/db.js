import mongoose from "mongoose";

// MONGO_DB, if set, picks the database. Otherwise the database named in MONGO_URI is
// used, and "joinclub" when the URI names none (mongodb://localhost:27017/).
const uriHasDb = (uri) => /^mongodb(\+srv)?:\/\/[^/]+\/[^?/]+/.test(uri || "");

const connectDB = async (uri = process.env.MONGO_URI) => {
  const dbName = process.env.MONGO_DB || (uriHasDb(uri) ? undefined : "joinclub");
  await mongoose.connect(uri, dbName ? { dbName } : {});
  console.log(`Connected to MongoDB (${mongoose.connection.name})`);
};

export default connectDB;
