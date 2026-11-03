import "server-only";
import * as oidc from "openid-client";
import { authSettings } from "./config";

export async function oidcClient() {
  const settings = authSettings();
  return oidc.discovery(settings.issuer, settings.clientId, undefined,
    settings.clientSecret ? oidc.ClientSecretBasic(settings.clientSecret) : oidc.None(), {
      timeout: 5,
      execute: settings.issuer.protocol === "http:"
        ? [oidc.allowInsecureRequests, oidc.enableNonRepudiationChecks]
        : [oidc.enableNonRepudiationChecks],
    });
}
