"use client";

import { useEffect } from "react";

export function ProfileVisitTracker({ fincaId }: { fincaId: string }) {
  useEffect(() => {
    void fetch(`/api/fincas/${fincaId}/visita`, {
      method: "POST",
      credentials: "same-origin",
    });
  }, [fincaId]);

  return null;
}
