import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27018/easygen?directConnection=true";

const databaseLogger = new Logger("MongoDB");

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI", DEFAULT_MONGODB_URI),
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
})
export class DatabaseModule {}
