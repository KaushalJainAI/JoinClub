// The database the test suite runs against.
//
// By default it is a throwaway in-memory MongoDB that starts and stops with the suite,
// so `npm test` needs no MongoDB installed and cannot reach a real one. Set
// TEST_MONGO_URI to use an existing server instead (CI points it at a service container).
//
// Either way the suite drops its database, so `assertTestDbName` refuses to continue
// unless the database it actually connected to is a test one.
export const TEST_DB_PREFIX = "joinclub_test";

const LOCAL_URI = /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/;

export async function startTestDb() {
  const external = process.env.TEST_MONGO_URI;
  const server = external ? null : await startMemoryServer();
  const uri = external || server.getUri();

  if (external && !LOCAL_URI.test(external)) {
    throw new Error(`Tests drop their database; refusing to run against non-local ${external.replace(/\/\/[^@]*@/, "//***@")}`);
  }
  return { uri, stop: () => server?.stop() };
}

// The real check, run after connecting: whatever we ended up on must be a test database.
// The suite appends its pid to the name so parallel runs never drop each other's data,
// so this matches the prefix rather than a suffix.
export function assertTestDbName(name) {
  if (!name || !name.startsWith(TEST_DB_PREFIX)) {
    throw new Error(`Refusing to run tests: connected to database "${name}", which is not a "${TEST_DB_PREFIX}*" database.`);
  }
}

async function startMemoryServer() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  // launchTimeout: the default 10s is not always enough on a cold or busy machine.
  return MongoMemoryServer.create({ binary: { version: "7.0.14" }, instance: { launchTimeout: 120_000 } });
}
