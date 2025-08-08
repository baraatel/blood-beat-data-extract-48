// Supabase Edge Function: vision-extract
// Uses Google Cloud Vision (DOCUMENT_TEXT_DETECTION) to OCR images
// Supports both service account and API key authentication

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Base64url encoding from Deno std
import { encode as base64url } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

function pemToKeyData(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replaceAll("\n", "")
    .replaceAll("\r", "");
  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToKeyData(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-vision",
    iat: now,
    exp: now + 3600,
  };
  const header = { alg: "RS256", typ: "JWT" };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput)
  );
  const encodedSig = base64url(new Uint8Array(signature));
  const jwt = `${signingInput}.${encodedSig}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    throw new Error(`Failed to get access token: ${tokenResp.status} ${err}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Try API key first, then service account
    const apiKey = Deno.env.get("GCP_API_KEY");
    const saJson = Deno.env.get("GCP_SERVICE_ACCOUNT");
    
    let authHeader = "";
    
    if (apiKey) {
      // Use API key authentication
      authHeader = `key=${apiKey}`;
    } else if (saJson) {
      // Use service account authentication
      const sa = JSON.parse(saJson);
      const accessToken = await getAccessToken(sa);
      authHeader = `Bearer ${accessToken}`;
    } else {
      return new Response(JSON.stringify({ error: "Missing GCP credentials (API key or service account)" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const visionReq = {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: {
            languageHints: ["en"],
            textDetectionParams: {
              enableTextDetectionConfidenceScore: true
            }
          }
        },
      ],
    };

    const visionResp = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(visionReq),
    });

    if (!visionResp.ok) {
      const err = await visionResp.text();
      return new Response(JSON.stringify({ error: `Vision API error: ${visionResp.status} ${err}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = await visionResp.json();
    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ||
      result?.responses?.[0]?.textAnnotations?.[0]?.description ||
      "";

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
