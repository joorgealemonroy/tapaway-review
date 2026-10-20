import { useCallback, useEffect, useState } from "react";
import { callFunction } from "./paymentFirst";
export type PersonalCatalog = {
  available: boolean;
  hubAvailable: boolean;
  amount: number;
  hubAmount: number;
  currency: string;
};
export function usePersonalCardCatalog() {
  const [catalog, setCatalog] = useState<PersonalCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const retry = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await callFunction<PersonalCatalog>(
        "personal-card-catalog",
        {},
      );
      if (
        !ok ||
        data.currency !== "usd" ||
        data.amount !== 3900 ||
        data.hubAmount !== 500
      )
        throw new Error("Catalog unavailable");
      setCatalog(data);
    } catch {
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void retry();
  }, [retry]);
  return { catalog, loading, retry };
}
