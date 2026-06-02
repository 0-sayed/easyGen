import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

const DEFAULT_MONGODB_HOST = "127.0.0.1";
const DEFAULT_MONGODB_PORT = "27018";

const databaseLogger = new Logger("MongoDB");

export function buildFallbackMongodbUri(mongodbPort: string): string {
  return `mongodb://${DEFAULT_MONGODB_HOST}:${mongodbPort}/easygen?directConnection=true`;
}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongodbPort = configService.get<string>("MONGODB_PORT", DEFAULT_MONGODB_PORT);

        return {
          uri: configService.get<string>("MONGODB_URI") ?? buildFallbackMongodbUri(mongodbPort),
          serverSelectionTimeoutMS: 10_000,
          connectionFactory: (connection: Connection): Connection => {
            connection.on("error", (error: Error) => {
              databaseLogger.error("MongoDB connection error.", error.stack);
            });

            connection.on("disconnected", () => {
              databaseLogger.warn("MongoDB connection disconnected.");
            });

            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
