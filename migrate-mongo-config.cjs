const path = require("node:path");
const { URL } = require("node:url");

const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const DEFAULT_MONGODB_DATABASE = "easygen";
const DEFAULT_MONGODB_PORT = "27018";

const mongodbUrl =
  process.env.MONGODB_URI ??
  `mongodb://127.0.0.1:${process.env.MONGODB_PORT ?? DEFAULT_MONGODB_PORT}/easygen?directConnection=true`;

function deriveDatabaseName(mongodbUri) {
  try {
    const parsedUrl = new URL(mongodbUri);
    const databaseName = parsedUrl.pathname.replace(/^\//, "");

    return databaseName || DEFAULT_MONGODB_DATABASE;
  } catch {
    return DEFAULT_MONGODB_DATABASE;
  }
}

const databaseName = process.env.MONGODB_DATABASE ?? deriveDatabaseName(mongodbUrl);

const config = {
  mongodb: {
    url: mongodbUrl,
    databaseName,
    options: {
      serverSelectionTimeoutMS: 10_000,
    },
  },
  migrationsDir: "migrations",
  changelogCollectionName: "migrations_changelog",
  lockCollectionName: "migrations_changelog_lock",
  lockTtl: 0,
  migrationFileExtension: ".cjs",
  useFileHash: false,
  moduleSystem: "commonjs",
};

module.exports = config;
