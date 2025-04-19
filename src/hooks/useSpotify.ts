import { useEffect, useRef, useState } from "react";
import { SpotifyApi, AuthorizationCodeWithPKCEStrategy, SdkOptions } from "@spotify/web-api-ts-sdk";

export function useSpotify(clientId: string, redirectUrl: string, scopes: string | string[], config?: SdkOptions) {
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const { current: activeScopes } = useRef(Array.isArray(scopes) ? scopes : [scopes]);

  useEffect(() => {
    (async () => {
      const auth = new AuthorizationCodeWithPKCEStrategy(clientId, redirectUrl, activeScopes);
      const internalSdk = new SpotifyApi(auth, config);
      try {
        const { authenticated } = await internalSdk.authenticate();
        if (authenticated) setSdk(internalSdk);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          (error as { message: string }).message.includes("No verifier found in cache")
        ) {
          console.error("Token-Exchange einmalig – Ignoriere diese Meldung im Dev-Modus", error);
        } else {
          console.error(error);
        }
      }
    })();
  }, [clientId, redirectUrl, config, activeScopes]);

  return sdk;
}