// Fetch untrusted public URLs without resolving the hostname again after validation.
// Pin each request to a public IP; keep the original Host and TLS server name.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

type Options = {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  allowHttp?: boolean;
  allowHosts?: string[];
  maxBytes?: number;
  timeoutMs?: number;
  truncate?: boolean;
};

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    // Only native global unicast. Excludes mapped IPv4, NAT64, ULA, link-local,
    // multicast, loopback and transition/documentation ranges.
    const first = parseInt(address.split(":")[0], 16);
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
      !/^2001:(?:0{0,4}|0?db8|[012][0-9a-f]{0,2}):/i.test(address) && !/^3fff:/i.test(address);
  }
  return false;
}

export function publicUrl(raw: string, options: Options = {}): URL {
  if (typeof raw !== "string" || raw.length > 2048) throw new Error("URL not allowed");
  const url = new URL(raw);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if ((url.protocol !== "https:" && !(options.allowHttp && url.protocol === "http:")) || url.username || url.password ||
      url.port || !host.includes(".") || host.includes(":") || /(?:^|\.)(localhost|local|internal|invalid|test)$/.test(host) ||
      ["metadata.google.internal", "metadata.goog"].includes(host)) throw new Error("URL not allowed");
  if (isIP(host) && !isPublicAddress(host)) throw new Error("URL not allowed");
  if (options.allowHosts?.length && !options.allowHosts.some(allowed => host === allowed || host.endsWith("." + allowed)))
    throw new Error("URL not allowed");
  url.hostname = host; url.hash = "";
  return url;
}

async function addressesFor(host: string, timeoutMs: number) {
  if (isIP(host)) return [{ address: host, family: isIP(host) }];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("DNS timeout")), timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function safeFetch(raw: string, options: Options = {}): Promise<Response> {
  let url = publicUrl(raw, options);
  const deadline = Date.now() + Math.min(options.timeoutMs || 8000, 15000);
  const limit = Math.min(options.maxBytes || 256000, 6000000);
  for (let hop = 0; hop <= 4; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Fetch timeout");
    const addresses = await addressesFor(url.hostname, Math.min(remaining, 3000));
    if (!addresses.length || addresses.some(record => !isPublicAddress(record.address))) throw new Error("URL not allowed");
    const pinned = addresses.find(record => record.family === 4) || addresses[0];
    const headers: Record<string, string> = { Host: url.host, "Accept-Encoding": "identity", Connection: "close" };
    // Credentials, cookies and caller-supplied Host never cross this boundary.
    for (const [key, value] of Object.entries(options.headers || {}))
      if (["accept", "user-agent"].includes(key.toLowerCase())) headers[key] = value;
    const response = await new Promise<Response>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)({
        hostname: pinned.address, family: pinned.family, port: url.protocol === "https:" ? 443 : 80,
        servername: isIP(url.hostname) ? undefined : url.hostname,
        rejectUnauthorized: true, path: url.pathname + url.search, method: options.method || "GET", headers,
        agent: false,
      }, incoming => {
        const status = incoming.statusCode || 502;
        if (status < 200 || status > 599 || (incoming.headers["content-encoding"] && incoming.headers["content-encoding"] !== "identity")) {
          clearTimeout(timer); incoming.destroy(); reject(new Error("Unsupported response")); return;
        }
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(incoming.headers))
          if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        const chunks: Uint8Array[] = []; let bytes = 0, finished = false;
        const finish = () => {
          if (finished) return; finished = true; clearTimeout(timer);
          const buffer = new Uint8Array(bytes); let offset = 0;
          for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
          responseHeaders.delete("content-length"); responseHeaders.delete("content-encoding");
          const result = new Response([204, 205, 304].includes(status) || options.method === "HEAD" ? null : buffer,
            { status, headers: responseHeaders });
          Object.defineProperty(result, "url", { value: url.href });
          resolve(result);
        };
        if (options.method === "HEAD" || [301, 302, 303, 307, 308].includes(status)) { finish(); incoming.destroy(); return; }
        incoming.on("data", (chunk: Uint8Array) => {
          if (finished) return;
          if (bytes + chunk.byteLength > limit) {
            if (!options.truncate) { finished = true; clearTimeout(timer); incoming.destroy(); reject(new Error("Response too large")); return; }
            chunks.push(chunk.subarray(0, limit - bytes)); bytes = limit; finish(); incoming.destroy(); return;
          }
          chunks.push(chunk); bytes += chunk.byteLength;
        });
        incoming.on("end", finish);
        incoming.on("error", error => { clearTimeout(timer); if (!finished) reject(error); });
      });
      const timer = setTimeout(() => request.destroy(new Error("Fetch timeout")), Math.max(1, deadline - Date.now()));
      request.on("error", error => { clearTimeout(timer); reject(error); });
      request.end();
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || hop === 4) throw new Error("Too many redirects");
    url = publicUrl(new URL(location, url).href, options);
  }
  throw new Error("Fetch unavailable");
}
