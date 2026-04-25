import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const R2_BUCKET = "logistica-tmtd";
const R2_REQUEST_TIMEOUT_MS = 25000;
const R2_MAX_RETRIES = 2;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetriableAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeStatus = (error as { status?: number }).status;
  if (typeof maybeStatus === "number" && [408, 429, 500, 502, 503, 504].includes(maybeStatus)) {
    return true;
  }

  const message = String((error as { message?: string }).message || "").toLowerCase();
  return /network|fetch|timeout|temporar|server|gateway|upstream|unexpected/.test(message);
}

async function verifyAdmin(req: Request): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const tokenMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return { authorized: false, error: "Missing authorization header" };
  }

  const token = tokenMatch[1].trim();
  if (!token) {
    return { authorized: false, error: "Missing authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const maxAuthAttempts = 3;
  let userId: string | undefined;
  let lastAuthError: unknown = null;

  for (let attempt = 1; attempt <= maxAuthAttempts; attempt++) {
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (!userError && userData?.user?.id) {
      userId = userData.user.id;
      break;
    }

    lastAuthError = userError;
    if (!isRetriableAuthError(userError) || attempt === maxAuthAttempts) {
      break;
    }

    await sleep(200 * attempt);
  }

  if (!userId) {
    console.error("verifyAdmin token validation failed", {
      reason: String((lastAuthError as { message?: string } | null)?.message || "unknown"),
    });
    return { authorized: false, error: "Invalid token" };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleData, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    return { authorized: false, error: "Admin access required" };
  }

  return { authorized: true, userId };
}

function getConfig() {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 credentials not configured");
  return { accountId, accessKeyId, secretAccessKey };
}

function toHex(data: Uint8Array): string {
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toAB(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.byteLength);
  new Uint8Array(ab).set(u);
  return ab;
}

async function sha256(data: Uint8Array | string): Promise<string> {
  const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", toAB(encoded));
  return toHex(new Uint8Array(hash));
}

async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey("raw", toAB(keyData), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, toAB(new TextEncoder().encode(data)));
  return new Uint8Array(sig);
}

async function signRequest(method: string, path: string, body: Uint8Array, contentType: string, config: ReturnType<typeof getConfig>) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256(body);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = `${method}\n/${R2_BUCKET}${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const kDate = await hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return {
    url: `https://${host}/${R2_BUCKET}${path}`,
    headers: {
      "Content-Type": contentType,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = R2_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`R2 request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function putObject(key: string, body: Uint8Array, contentType: string) {
  const config = getConfig();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const safeContentType = contentType || "application/octet-stream";

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= R2_MAX_RETRIES + 1; attempt++) {
    try {
      const { url, headers } = await signRequest("PUT", `/${encodedKey}`, body, safeContentType, config);
      const res = await fetchWithTimeout(url, { method: "PUT", headers, body });

      if (res.ok) return;

      const text = await res.text();
      const retriable = res.status >= 500 || res.status === 429 || res.status === 408;
      lastError = new Error(`R2 PUT failed (${res.status}): ${text}`);

      if (!retriable || attempt > R2_MAX_RETRIES) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt > R2_MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("R2 PUT failed");
}

async function deleteObject(key: string) {
  const config = getConfig();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const emptyBody = new Uint8Array(0);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= R2_MAX_RETRIES + 1; attempt++) {
    try {
      const { url, headers } = await signRequest("DELETE", `/${encodedKey}`, emptyBody, "application/octet-stream", config);
      const res = await fetchWithTimeout(url, { method: "DELETE", headers });

      if (res.ok) return;

      const text = await res.text();
      const retriable = res.status >= 500 || res.status === 429 || res.status === 408;
      lastError = new Error(`R2 DELETE failed (${res.status}): ${text}`);

      if (!retriable || attempt > R2_MAX_RETRIES) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt > R2_MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("R2 DELETE failed");
}

async function listObjects(prefix?: string) {
  const config = getConfig();
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  const emptyBody = new Uint8Array(0);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const region = "auto";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = await sha256(emptyBody);

  const queryString = prefix ? `prefix=${encodeURIComponent(prefix)}` : "";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `GET\n/${R2_BUCKET}/\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const kDate = await hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const url = `https://${host}/${R2_BUCKET}/${qs}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });

  return await res.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "ping") {
      const accountId = Deno.env.get("R2_ACCOUNT_ID");
      const hasKeys = !!Deno.env.get("R2_ACCESS_KEY_ID") && !!Deno.env.get("R2_SECRET_ACCESS_KEY");
      return new Response(JSON.stringify({ ok: true, accountId: accountId?.slice(0, 8) + "...", hasKeys }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const folder = (formData.get("folder") as string) || "geral";

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type?.toLowerCase())) {
        return new Response(JSON.stringify({ error: "File type not allowed. Only images are accepted." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: "File too large. Maximum 10MB." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "geral";

      const mimeExtMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/heic": "jpg",
        "image/heif": "jpg",
      };

      const isGenericName = /^image\.|^photo\.|^IMG_|^\./.test(file.name) || !file.name.includes("-");
      let finalName: string;

      if (isGenericName) {
        const ext = mimeExtMap[file.type?.toLowerCase()] || file.name.split(".").pop() || "jpg";
        finalName = `${safeFolder}/${crypto.randomUUID()}.${ext}`;
      } else {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
        finalName = `${safeFolder}/${safeName}`;
      }

      const fileName = finalName;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const contentType = file.type || "application/octet-stream";

      await putObject(fileName, buffer, contentType);

      const rawDomain = Deno.env.get("R2_PUBLIC_DOMAIN") || `pub-${Deno.env.get("R2_ACCOUNT_ID")}.r2.dev`;
      const publicDomain = rawDomain.replace(/^https?:\/\//, "");
      const publicUrl = `https://${publicDomain}/${fileName}`;

      return new Response(JSON.stringify({ url: publicUrl, key: fileName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "delete") {
      const { key } = await req.json();
      if (!key || typeof key !== "string") {
        return new Response(JSON.stringify({ error: "No key provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (key.includes("..") || key.startsWith("/")) {
        return new Response(JSON.stringify({ error: "Invalid key" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await deleteObject(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "list") {
      const folder = url.searchParams.get("folder") || "";
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
      const xml = await listObjects(safeFolder ? `${safeFolder}/` : undefined);
      return new Response(JSON.stringify({ raw: xml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("R2 error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});