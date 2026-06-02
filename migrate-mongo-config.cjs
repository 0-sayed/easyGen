const path = require("node:path");

const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const databaseName = process.env.MONGODB_DATABASE ?? "easygen";
const mongodbUrl =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018/easygen?directConnection=true";

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
