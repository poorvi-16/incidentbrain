import { useEffect, useState } from "react";
import { api } from "../api/client";

type HealthResponse = {
  ok: boolean;
  service: string;
  demoMode: boolean;
  timestamp: string;
};

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<HealthResponse>("/health");
        setHealth(response.data);
      } catch (error) {
        console.error("Failed to load backend health", error);
      }
    }

    void load();
  }, []);

  return health;
}
