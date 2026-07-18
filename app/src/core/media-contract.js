/**
 * YOU ARE WILD MEDIA CONTRACT
 * Backend-neutral descriptors, validation, hashing, and bounded byte helpers.
 */

const YAW_MEDIA_CONTRACT = {
    VERSION: 1,
    DEFAULT_MAX_RESOURCE_BYTES: 16 * 1024 * 1024,
    DEFAULT_TIMEOUT_MS: 20000,
    FORBIDDEN_MIME_TYPES: new Set([
        'text/html',
        'application/xhtml+xml',
        'application/javascript',
        'text/javascript',
        'image/svg+xml'
    ]),

    error(code, message, details = {}) {
        const error = new Error(String(message || code || 'Media operation failed'));
        error.name = 'MediaError';
        error.code = String(code || 'media_error');
        error.details = this.serializable(details);
        return error;
    },

    serializable(value, fallback = {}) {
        try {
            return JSON.parse(JSON.stringify(value === undefined ? fallback : value));
        } catch (error) {
            return JSON.parse(JSON.stringify(fallback));
        }
    },

    token(value, field = 'id') {
        const token = String(value || '').trim();
        if (!token || token.length > 160 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw this.error('invalid_descriptor', `Media ${field} must be a token string`);
        }
        return token;
    },

    hash(value) {
        const hash = String(value || '').trim().toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(hash)) {
            throw this.error('invalid_integrity', 'Media SHA-256 must be 64 hexadecimal characters');
        }
        return hash;
    },

    mimeType(value) {
        const mimeType = String(value || '').split(';')[0].trim().toLowerCase();
        if (!mimeType || mimeType.length > 120 || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)) {
            throw this.error('invalid_mime', 'Media MIME type is invalid');
        }
        if (this.FORBIDDEN_MIME_TYPES.has(mimeType)) {
            throw this.error('unsupported_mime', `Media MIME type ${mimeType} is not supported`);
        }
        return mimeType;
    },

    descriptor(value, options = {}) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this.error('invalid_descriptor', 'Media descriptor must be an object');
        }
        const byteLength = Number(value.byteLength);
        const maxBytes = Math.max(1, Number(options.maxBytes) || this.DEFAULT_MAX_RESOURCE_BYTES);
        if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > maxBytes) {
            throw this.error('invalid_size', `Media byteLength must be between 1 and ${maxBytes}`);
        }
        const width = value.width === undefined || value.width === null ? null : Number(value.width);
        const height = value.height === undefined || value.height === null ? null : Number(value.height);
        if (width !== null && (!Number.isInteger(width) || width <= 0 || width > 32768)) {
            throw this.error('invalid_dimensions', 'Media width is invalid');
        }
        if (height !== null && (!Number.isInteger(height) || height <= 0 || height > 32768)) {
            throw this.error('invalid_dimensions', 'Media height is invalid');
        }
        return {
            id: this.token(value.id, 'id'),
            hash: this.hash(value.hash || value.sha256),
            mimeType: this.mimeType(value.mimeType),
            byteLength,
            width,
            height,
            role: value.role ? this.token(value.role, 'role') : 'media',
            license: String(value.license || '').trim().slice(0, 240),
            provenance: this.serializable(value.provenance, {}),
            fallback: this.serializable(value.fallback, null),
            source: this.serializable(value.source, {})
        };
    },

    isLoopbackHostname(hostname) {
        const host = String(hostname || '').toLowerCase();
        if (host === 'localhost' || host === '::1') return true;
        const match = host.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        return Boolean(match && match.slice(1).every(part => Number(part) <= 255));
    },

    httpUrl(value, options = {}) {
        let url;
        try {
            url = new URL(String(value || '').trim());
        } catch (error) {
            throw this.error('invalid_url', 'Media URL is invalid');
        }
        const loopback = this.isLoopbackHostname(url.hostname);
        if (url.protocol !== 'https:' && !(options.allowLoopback !== false && url.protocol === 'http:' && loopback)) {
            throw this.error('insecure_url', 'Media URLs require HTTPS, except for permitted HTTP loopback endpoints');
        }
        if (url.username || url.password) throw this.error('credentialed_url', 'Media URLs cannot contain credentials');
        if (url.search) throw this.error('query_url', 'Media URLs cannot contain query parameters');
        if (url.hash) throw this.error('fragment_url', 'Media URLs cannot contain fragments');
        return url.href;
    },

    endpointUrl(value) {
        const href = this.httpUrl(value);
        const url = new URL(href);
        url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
        return url.href;
    },

    async sha256(bytes) {
        const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
        if (!cryptoApi?.subtle?.digest) {
            throw this.error('integrity_unavailable', 'SHA-256 verification is unavailable in this runtime');
        }
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const digest = new Uint8Array(await cryptoApi.subtle.digest('SHA-256', view));
        return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    assertSignature(bytes, mimeType) {
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const matches = (...signature) => signature.every((byte, index) => view[index] === byte);
        if (mimeType === 'image/png' && !matches(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
            throw this.error('mime_mismatch', 'PNG media does not have a valid PNG signature');
        }
        if (mimeType === 'image/jpeg' && !matches(0xff, 0xd8, 0xff)) {
            throw this.error('mime_mismatch', 'JPEG media does not have a valid JPEG signature');
        }
        if (mimeType === 'image/webp') {
            const riff = matches(0x52, 0x49, 0x46, 0x46);
            const webp = view.length >= 12 && String.fromCharCode(...view.slice(8, 12)) === 'WEBP';
            if (!riff || !webp) throw this.error('mime_mismatch', 'WebP media does not have a valid WebP signature');
        }
        return true;
    },

    async readBoundedResponse(response, options = {}) {
        const maxBytes = Math.max(1, Number(options.maxBytes) || this.DEFAULT_MAX_RESOURCE_BYTES);
        const expectedBytes = options.expectedBytes === undefined ? null : Number(options.expectedBytes);
        const declared = Number(response.headers?.get?.('content-length') || 0);
        if (declared > maxBytes || (expectedBytes !== null && declared > 0 && declared !== expectedBytes)) {
            throw this.error(declared > maxBytes ? 'resource_too_large' : 'size_mismatch', 'Media response size is invalid');
        }
        const chunks = [];
        let total = 0;
        if (response.body?.getReader) {
            const reader = response.body.getReader();
            try {
                while (true) {
                    if (options.signal?.aborted) throw this.error('aborted', 'Media operation was canceled');
                    const { done, value } = await reader.read();
                    if (done) break;
                    total += value.byteLength;
                    if (total > maxBytes) {
                        await reader.cancel();
                        throw this.error('resource_too_large', `Media exceeds the ${maxBytes} byte limit`);
                    }
                    chunks.push(value);
                    options.onProgress?.({ loaded: total, total: expectedBytes || declared || null });
                }
            } finally {
                reader.releaseLock?.();
            }
        } else {
            const bytes = new Uint8Array(await response.arrayBuffer());
            total = bytes.byteLength;
            if (total > maxBytes) throw this.error('resource_too_large', `Media exceeds the ${maxBytes} byte limit`);
            chunks.push(bytes);
            options.onProgress?.({ loaded: total, total: expectedBytes || declared || total });
        }
        if (expectedBytes !== null && total !== expectedBytes) {
            throw this.error('size_mismatch', `Media returned ${total} bytes; expected ${expectedBytes}`);
        }
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return bytes;
    }
};

if (typeof window !== 'undefined') window.YAW_MEDIA_CONTRACT = YAW_MEDIA_CONTRACT;
