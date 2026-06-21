import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

import { DatabaseReadinessService } from "./database-readiness.service";

const databaseLogger = new Logger("MongoDB");

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGODB_URI"),
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
      }),
    }),
  ],
  providers: [DatabaseReadinessService],
  exports: [DatabaseReadinessService],
})
export class DatabaseModule {}
