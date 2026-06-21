import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { STATES, type Connection } from "mongoose";

export interface DatabaseReadyResponse {
  status: "ready";
  checks: {
    database: "ready";
  };
}

@Injectable()
export class DatabaseReadinessService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getReadiness(): DatabaseReadyResponse {
    if (this.connection.readyState === STATES.connected) {
      return {
        status: "ready",
        checks: { database: "ready" },
      };
    }

    throw new ServiceUnavailableException({
      status: "error",
      checks: { database: "unavailable" },
      message: "Database connection is not ready.",
    });
  }
}
