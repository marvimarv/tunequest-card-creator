import { useEffect, useRef, useState } from "react";
import { SpotifyApi, AuthorizationCodeWithPKCEStrategy, SdkOptions } from "@spotify/web-api-ts-sdk";

export function useSpotify(clientId: string, redirectUrl: string, scopes: string[], config?: SdkOptions) {
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const { current: activeScopes } = useRef(scopes);

  useEffect(() => {
    (async () => {
      const auth = new AuthorizationCodeWithPKCEStrategy(clientId, redirectUrl, activeScopes);
      const internalSdk = new SpotifyApi(auth, config);
      try {
        const { authenticated } = await internalSdk.authenticate();
        if (authenticated) setSdk(internalSdk);
      } catch (e: any) {
        if (e.message.includes("No verifier found in cache")) {
          console.error("Token-Exchange einmalig – Ignoriere diese Meldung im Dev-Modus", e);
        } else {
          console.error(e);
        }
      }
    })();
  }, [clientId, redirectUrl, config, activeScopes]);

  return sdk;
}