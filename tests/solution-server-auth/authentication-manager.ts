interface HubPAT {
  id: number;
  token: string;
  lifespan: number;
  expiration: string; // ISO 8601 timestamp
}

/**
 * Manages Hub authentication using Personal Access Tokens (PATs).
 *
 * Hub's built-in OIDC provider (tackle2-hub#1042) supports Basic Auth on
 * POST /hub/auth/tokens to create a PAT. The PAT is used as a Bearer token.
 */
export class AuthenticationManager {
  private readonly previousTlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  private bearerToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private tokenPromise: Promise<void> | null = null;

  private readonly patLifespanHours = 24;

  constructor(
    private readonly baseUrl: string,
    private readonly _realm: string, // kept for API compatibility, no longer used
    private readonly username: string,
    private readonly password: string,
    private readonly insecure: boolean = true
  ) {
    if (this.insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  private async authenticate(): Promise<void> {
    const tokensUrl = this.getTokensUrl();
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    const body = JSON.stringify({ lifespan: this.patLifespanHours });

    const pat = await this.fetchPAT(tokensUrl, credentials, body);
    this.bearerToken = pat.token;
    this.tokenExpiresAt = new Date(pat.expiration).getTime();
  }

  public async getBearerToken(forceRefresh = false): Promise<string> {
    if (forceRefresh) {
      this.tokenExpiresAt = 0;
    }
    await this.ensureAuthenticated();
    if (!this.bearerToken) {
      throw new Error('Authentication failed: no token available');
    }
    return this.bearerToken;
  }

  private getTokensUrl(): string {
    const url = new URL(this.baseUrl);
    return `${url.protocol}//${url.host}/hub/auth/tokens`;
  }

  private async fetchPAT(tokensUrl: string, credentials: string, body: string): Promise<HubPAT> {
    const timeoutMs = 10000;

    if (this.insecure && tokensUrl.startsWith('https://')) {
      return this.fetchPATInsecure(tokensUrl, credentials, body, timeoutMs);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(tokensUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(`Hub PAT creation failed: ${response.status} ${msg}`);
      }

      return (await response.json()) as HubPAT;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Hub PAT creation timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchPATInsecure(
    tokensUrl: string,
    credentials: string,
    body: string,
    timeoutMs: number
  ): Promise<HubPAT> {
    const https = await import('https');
    const { URL } = await import('url');

    const parsedUrl = new URL(tokensUrl);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
        },
        rejectUnauthorized: false,
        timeout: timeoutMs,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as HubPAT);
            } catch (error) {
              reject(new Error(`Failed to parse Hub PAT response: ${error}`));
            }
          } else {
            reject(new Error(`Hub PAT creation failed: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Hub PAT creation timed out after ${timeoutMs}ms`));
      });

      req.write(body);
      req.end();
    });
  }

  private hasValidToken(): boolean {
    return (
      this.bearerToken !== null &&
      this.tokenExpiresAt !== null &&
      Date.now() < this.tokenExpiresAt - 5 * 60 * 1000 // 5-minute buffer
    );
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }
    if (this.hasValidToken()) {
      return;
    }
    this.tokenPromise = this.authenticate().finally(() => {
      this.tokenPromise = null;
    });
    return this.tokenPromise;
  }

  public dispose(): void {
    if (this.insecure) {
      if (this.previousTlsRejectUnauthorized === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = this.previousTlsRejectUnauthorized;
      }
    }
    this.tokenPromise = null;
    this.bearerToken = null;
    this.tokenExpiresAt = null;
  }
}
