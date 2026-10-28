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

type NativeConn = {
  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  close(): void;
};
type NativeNet = {
  connect(options: { hostname: string; port: number; transport: "tcp" }): Promise<NativeConn>;
  startTls(connection: NativeConn, options: { hostname: string; alpnProtocols: string[] }): Promise<NativeConn>;
  version?: { deno?: string };
};

// Supabase's Deno 2.1 compatibility layer verifies node:https against its
// connection IP despite servername. Use the documented native TLS upgrade:
// connect exactly once to the validated IP, then verify TLS against the URL's
// hostname. No extra DNS lookup and no certificate-verification override.
async function nativeRequest(url: URL, address: string, headers: Record<string, string>,
  options: Options, deadline: number, limit: number, runtime: NativeNet): Promise<Response> {
  let connection: NativeConn | undefined;
  let expired = false;
  const close = () => { try { connection?.close(); } catch { /* already closed */ } };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { expired = true; close(); reject(new Error("Fetch timeout")); }, Math.max(1, deadline - Date.now()));
  });
  const operation = async () => {
    connection = await runtime.connect({ hostname: address, port: url.protocol === "https:" ? 443 : 80, transport: "tcp" });
    if (expired) { close(); throw new Error("Fetch timeout"); }
    if (url.protocol === "https:") {
      connection = await runtime.startTls(connection, { hostname: url.hostname, alpnProtocols: ["http/1.1"] });
      if (expired) { close(); throw new Error("Fetch timeout"); }
    }
    const encoder = new TextEncoder(), decoder = new TextDecoder();
    const request = `${options.method || "GET"} ${url.pathname + url.search} HTTP/1.1\r\n` +
      Object.entries(headers).map(([key, value]) => {
        if (/[\r\n]/.test(key + value)) throw new Error("Invalid request header");
        return `${key}: ${value}\r\n`;
      }).join("") + "\r\n";
    const outgoing = encoder.encode(request);
    for (let written = 0; written < outgoing.length;) {
      const count = await connection.write(outgoing.subarray(written));
      if (!count) throw new Error("Request interrupted");
      written += count;
    }
    let pending = new Uint8Array(0);
    const read = async () => {
      const bytes = new Uint8Array(16384);
      const count = await connection!.read(bytes);
      if (count === null) return false;
      if (!count) throw new Error("Empty response read");
      const joined = new Uint8Array(pending.length + count);
      joined.set(pending); joined.set(bytes.subarray(0, count), pending.length); pending = joined;
      return true;
    };
    const line = async (max: number): Promise<string> => {
      while (true) {
        let end = -1;
        for (let i = 0; i < pending.length - 1; i++) if (pending[i] === 13 && pending[i + 1] === 10) { end = i; break; }
        if (end >= 0) {
          if (end > max) throw new Error("Response headers too large");
          const result = decoder.decode(pending.subarray(0, end)); pending = pending.subarray(end + 2); return result;
        }
        if (pending.length > max + 1 || !await read()) throw new Error("Incomplete response headers");
      }
    };
    let status = 0, responseHeaders = new Headers();
    for (let interim = 0; interim < 6; interim++) {
      const statusLine = await line(8192), match = /^HTTP\/1\.[01] ([1-5]\d{2})(?: [^\r\n]*)?$/.exec(statusLine);
      if (!match) throw new Error("Invalid response status");
      status = Number(match[1]); responseHeaders = new Headers(); let headerBytes = statusLine.length;
      while (true) {
        const value = await line(8192); headerBytes += value.length + 2;
        if (headerBytes > 32768) throw new Error("Response headers too large");
        if (!value) break;
        const header = /^([!#$%&'*+.^_`|~\da-z-]+):[ \t]*([^\r\n]*)$/i.exec(value);
        if (!header) throw new Error("Invalid response header");
        responseHeaders.append(header[1], header[2]);
      }
      if (status >= 200) break;
      if (status === 101 || interim === 5) throw new Error("Unsupported protocol upgrade");
    }
    const coding = responseHeaders.get("content-encoding");
    if (coding && coding.toLowerCase() !== "identity") throw new Error("Unsupported response encoding");
    const chunks: Uint8Array[] = []; let size = 0;
    const append = (chunk: Uint8Array) => {
      if (size + chunk.length > limit) {
        if (!options.truncate) throw new Error("Response too large");
        chunks.push(chunk.subarray(0, limit - size)); size = limit; return false;
      }
      chunks.push(chunk); size += chunk.length; return true;
    };
    const response = () => {
      const bytes = new Uint8Array(size); let at = 0;
      for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
      responseHeaders.delete("content-length"); responseHeaders.delete("transfer-encoding"); responseHeaders.delete("content-encoding");
      const result = new Response(options.method === "HEAD" || [204, 205, 304].includes(status) ? null : bytes, { status, headers: responseHeaders });
      Object.defineProperty(result, "url", { value: url.href }); return result;
    };
    if (options.method === "HEAD" || [204, 205, 304, 301, 302, 303, 307, 308].includes(status)) return response();
    const transfer = responseHeaders.get("transfer-encoding"), length = responseHeaders.get("content-length");
    if (transfer && (transfer.toLowerCase() !== "chunked" || length !== null)) throw new Error("Ambiguous response framing");
    if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new Error("Invalid response length");
    const readBytes = async (count: number) => {
      while (count > 0) {
        if (!pending.length && !await read()) throw new Error("Incomplete response body");
        const part = pending.subarray(0, Math.min(pending.length, count)); pending = pending.subarray(part.length); count -= part.length;
        if (!append(part)) return false;
      }
      return true;
    };
    if (transfer) {
      while (true) {
        const chunkLine = await line(1024), match = /^([\da-f]+)(?:;[^\r\n]*)?$/i.exec(chunkLine);
        if (!match) throw new Error("Invalid response chunk");
        const count = parseInt(match[1], 16);
        if (!Number.isSafeInteger(count)) throw new Error("Invalid response chunk");
        if (count === 0) return response(); // No connection reuse; trailers need not be read.
        if (!await readBytes(count)) return response();
        if (await line(0) !== "") throw new Error("Invalid response chunk boundary");
      }
    } else if (length !== null) {
      await readBytes(Number(length));
    } else {
      do { const bytes = pending; pending = new Uint8Array(0); if (!append(bytes)) return response(); } while (await read());
    }
    return response();
  };
  try { return await Promise.race([operation(), timeout]); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = /cert|tls|ssl/i.test(message) ? "tls_verification_failed" : /timeout/i.test(message) ? "timeout" : "request_failed";
    console.warn("[safe-fetch]", { host: url.hostname, code, runtime: runtime.version?.deno || "unknown" });
    throw error;
  } finally { if (timer) clearTimeout(timer); close(); }
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
    const native = Deno as unknown as NativeNet;
    const response = typeof native.connect === "function" && typeof native.startTls === "function"
      ? await nativeRequest(url, pinned.address, headers, options, deadline, limit, native)
      : await new Promise<Response>((resolve, reject) => {
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
