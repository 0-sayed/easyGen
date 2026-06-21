import { ServiceUnavailableException } from "@nestjs/common";
import type { Connection } from "mongoose";
import { describe, expect, it } from "vitest";

import { DatabaseReadinessService } from "./database-readiness.service";

describe("DatabaseReadinessService", () => {
  function createService(readyState: Connection["readyState"]): DatabaseReadinessService {
    return new DatabaseReadinessService({ readyState } as Connection);
  }

  it("returns ready when the database connection is connected", () => {
    expect(createService(1).getReadiness()).toEqual({
      status: "ready",
      checks: { database: "ready" },
    });
  });

  it.each([0, 2, 3] as const)(
    "throws unavailable when the database connection readyState is %s",
    (readyState) => {
      expect(() => createService(readyState).getReadiness()).toThrow(ServiceUnavailableException);

      try {
        createService(readyState).getReadiness();
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getResponse()).toEqual({
          status: "error",
          checks: { database: "unavailable" },
          message: "Database connection is not ready.",
        });
      }
    }
  );
});
