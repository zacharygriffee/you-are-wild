/**
 * YOU ARE WILD HTTP MEDIA PROVIDERS
 * Reviewed HTTP acquisition plus capability-based endpoint/sidecar storage.
 */

class YAWHttpMediaSource {
    constructor(options = {}) {
        this.id = String(options.id || 'http');
        this.contract = options.contract || YAW_MEDIA_CONTRACT;
        this.fetchApi = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
        this.timeoutMs = Math.max(1000, Number(options.timeoutMs) || this.contract.DEFAULT_TIMEOUT_MS);
        this.maxBytes = Math.max(1, Number(options.maxBytes) || this.contract.DEFAULT_MAX_RESOURCE_BYTES);
    }

    capabilities() {
        return { source: true, store: false, lease: false, streamedReads: true, integrity: 'sha256' };
    }

    async health() {
        return { ok: Boolean(this.fetchApi), providerId: this.id, capabilities: this.capabilities() };
    }

    _controller(externalSignal) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        externalSignal?.addEventListener?.('abort', abort, { once: true });
        const timer = setTimeout(abort, this.timeoutMs);
        return {
            controller,
            done() {
                clearTimeout(timer);
                externalSignal?.removeEventListener?.('abort', abort);
            }
        };
    }

    async acquire(input, options = {}) {
        if (!this.fetchApi) throw this.contract.error('source_unavailable', 'HTTP media acquisition is unavailable');
        const descriptor = this.contract.descriptor(input?.descriptor || input, { maxBytes: options.maxBytes || this.maxBytes });
        const url = this.contract.httpUrl(input?.url || descriptor.source?.url);
        const timed = this._controller(options.signal);
        let response;
        try {
            response = await this.fetchApi(url, {
                method: 'GET',
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                headers: { Accept: descriptor.mimeType },
                signal: timed.controller.signal
            });
        } catch (error) {
            timed.done();
            if (timed.controller.signal.aborted) throw this.contract.error(options.signal?.aborted ? 'aborted' : 'source_timeout', 'HTTP media acquisition was canceled or timed out');
            throw this.contract.error('source_failed', 'HTTP media acquisition failed');
        }
        try {
            if (!response.ok) throw this.contract.error('source_http_error', `Media endpoint returned HTTP ${response.status}`, { status: response.status });
            const responseUrl = this.contract.httpUrl(response.url || url);
            if (responseUrl !== url) throw this.contract.error('source_redirected', 'Media endpoint redirects are not allowed');
            const responseType = String(response.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase();
            if (responseType && this.contract.mimeType(responseType) !== descriptor.mimeType) {
                throw this.contract.error('mime_mismatch', `Media endpoint returned ${responseType}; expected ${descriptor.mimeType}`);
            }
            const bytes = await this.contract.readBoundedResponse(response, {
                maxBytes: options.maxBytes || this.maxBytes,
                expectedBytes: descriptor.byteLength,
                signal: timed.controller.signal,
                onProgress: options.onProgress
            });
            this.contract.assertSignature(bytes, descriptor.mimeType);
            if (await this.contract.sha256(bytes) !== descriptor.hash) {
                throw this.contract.error('integrity_mismatch', `Media ${descriptor.id} failed SHA-256 verification`);
            }
            return {
                providerId: this.id,
                descriptor: {
                    ...descriptor,
                    source: { ...descriptor.source, kind: 'http', url }
                },
                blob: new Blob([bytes], { type: descriptor.mimeType })
            };
        } catch (error) {
            if (timed.controller.signal.aborted) throw this.contract.error(options.signal?.aborted ? 'aborted' : 'source_timeout', 'HTTP media acquisition was canceled or timed out');
            if (error?.name === 'MediaError') throw error;
            throw this.contract.error('source_failed', 'HTTP media acquisition failed');
        } finally {
            timed.done();
        }
    }
}

class YAWEndpointMediaStore {
    constructor(options = {}) {
        this.id = String(options.id || 'endpoint');
        this.contract = options.contract || YAW_MEDIA_CONTRACT;
        this.endpoint = this.contract.endpointUrl(options.endpoint);
        this.fetchApi = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
        this.sessionHeaders = this._normalizeHeaders(options.sessionHeaders || {});
        this.timeoutMs = Math.max(1000, Number(options.timeoutMs) || this.contract.DEFAULT_TIMEOUT_MS);
        this.maxBytes = Math.max(1, Number(options.maxBytes) || this.contract.DEFAULT_MAX_RESOURCE_BYTES);
        this.urlApi = options.urlApi || (typeof URL !== 'undefined' ? URL : null);
        this.remoteCapabilities = null;
        this.leases = new Map();
    }

    _normalizeHeaders(value) {
        const headers = {};
        for (const [nameValue, headerValue] of Object.entries(value || {})) {
            const name = String(nameValue || '').trim();
            if (!/^[A-Za-z0-9-]{1,80}$/.test(name) || /^(?:cookie|host|origin|referer|content-length)$/i.test(name)) {
                throw this.contract.error('invalid_endpoint_headers', 'Endpoint session header is not allowed');
            }
            headers[name] = String(headerValue || '').slice(0, 2000);
        }
        return headers;
    }

    capabilities() {
        return {
            source: true,
            store: true,
            lease: true,
            stagedWrites: true,
            contentAddressed: true,
            streamedReads: true,
            rangeReads: this.remoteCapabilities?.rangeReads === true,
            directLease: false
        };
    }

    _url(path) {
        return new URL(String(path || '').replace(/^\/+/, ''), this.endpoint).href;
    }

    _controller(externalSignal) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        externalSignal?.addEventListener?.('abort', abort, { once: true });
        const timer = setTimeout(abort, this.timeoutMs);
        return {
            controller,
            done() {
                clearTimeout(timer);
                externalSignal?.removeEventListener?.('abort', abort);
            }
        };
    }

    async _fetch(path, options = {}) {
        if (!this.fetchApi) throw this.contract.error('store_unavailable', 'Endpoint media storage is unavailable');
        const timed = this._controller(options.signal);
        try {
            const response = await this.fetchApi(this._url(path), {
                method: options.method || 'GET',
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                headers: { ...this.sessionHeaders, ...(options.headers || {}) },
                body: options.body,
                signal: timed.controller.signal
            });
            if (options.deferTimeout === true) {
                return { response, signal: timed.controller.signal, done: timed.done };
            }
            timed.done();
            return response;
        } catch (error) {
            timed.done();
            if (timed.controller.signal.aborted) throw this.contract.error(options.signal?.aborted ? 'aborted' : 'endpoint_timeout', 'Media endpoint request was canceled or timed out');
            throw this.contract.error('endpoint_unavailable', 'Media endpoint is unavailable');
        }
    }

    async health(options = {}) {
        const response = await this._fetch('media/v1/health', { signal: options.signal });
        if (!response.ok) return { ok: false, providerId: this.id, status: response.status, capabilities: this.capabilities() };
        let value;
        try { value = await response.json(); } catch (error) { value = null; }
        if (!value || value.schema !== 'yaw-media-endpoint-v1') {
            throw this.contract.error('endpoint_protocol', 'Media endpoint returned an unsupported protocol');
        }
        this.remoteCapabilities = this.contract.serializable(value.capabilities, {});
        return { ok: true, providerId: this.id, capabilities: this.capabilities() };
    }

    async estimate(options = {}) {
        const response = await this._fetch('media/v1/estimate', { signal: options.signal });
        if (!response.ok) return { usage: null, quota: null };
        const value = await response.json();
        return {
            usage: Number.isFinite(Number(value.usage)) ? Number(value.usage) : null,
            quota: Number.isFinite(Number(value.quota)) ? Number(value.quota) : null
        };
    }

    async beginBatch(options = {}) {
        const response = await this._fetch('media/v1/batches', { method: 'POST', signal: options.signal });
        if (!response.ok) throw this.contract.error('endpoint_write_failed', `Media endpoint returned HTTP ${response.status}`);
        const value = await response.json();
        return { id: this.contract.token(value.batchId, 'batch id'), providerId: this.id, status: 'staging' };
    }

    async stage(batch, descriptorValue, payload, options = {}) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const descriptor = this.contract.descriptor(descriptorValue, { maxBytes: options.maxBytes || this.maxBytes });
        const blob = payload instanceof Blob ? payload : new Blob([payload], { type: descriptor.mimeType });
        if (blob.size !== descriptor.byteLength) throw this.contract.error('size_mismatch', 'Endpoint media payload size is invalid');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        this.contract.assertSignature(bytes, descriptor.mimeType);
        if (await this.contract.sha256(bytes) !== descriptor.hash) throw this.contract.error('integrity_mismatch', 'Endpoint media payload failed SHA-256 verification');
        const response = await this._fetch(`media/v1/batches/${encodeURIComponent(batchId)}/content/${descriptor.hash}`, {
            method: 'PUT',
            signal: options.signal,
            headers: {
                'Content-Type': descriptor.mimeType,
                'X-YAW-Media-Bytes': String(descriptor.byteLength),
                'X-YAW-Media-SHA256': descriptor.hash
            },
            body: blob
        });
        if (!response.ok) throw this.contract.error('endpoint_write_failed', `Media endpoint returned HTTP ${response.status}`);
        return { batchId, descriptor };
    }

    async commit(batch, options = {}) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const response = await this._fetch(`media/v1/batches/${encodeURIComponent(batchId)}/commit`, { method: 'POST', signal: options.signal });
        if (!response.ok) throw this.contract.error('endpoint_commit_failed', `Media endpoint returned HTTP ${response.status}`);
        return { batchId, providerId: this.id };
    }

    async abort(batch, options = {}) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const response = await this._fetch(`media/v1/batches/${encodeURIComponent(batchId)}`, { method: 'DELETE', signal: options.signal });
        return response.ok || response.status === 404;
    }

    async stat(hashValue, options = {}) {
        const hash = this.contract.hash(hashValue);
        const response = await this._fetch(`media/v1/content/${hash}`, { method: 'HEAD', signal: options.signal });
        if (response.status === 404) return null;
        if (!response.ok) throw this.contract.error('endpoint_read_failed', `Media endpoint returned HTTP ${response.status}`);
        const byteLength = Number(response.headers.get('content-length'));
        if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > this.maxBytes) {
            throw this.contract.error('endpoint_protocol', 'Media endpoint returned an invalid content length');
        }
        return {
            hash,
            mimeType: this.contract.mimeType(response.headers.get('content-type')),
            byteLength,
            providerId: this.id
        };
    }

    async has(hashValue, options = {}) {
        return Boolean(await this.stat(hashValue, options));
    }

    async open(hashValue, options = {}) {
        const hash = this.contract.hash(hashValue);
        const stat = await this.stat(hash, options);
        if (!stat) throw this.contract.error('media_missing', 'Endpoint media payload is unavailable');
        const pending = await this._fetch(`media/v1/content/${hash}`, { signal: options.signal, deferTimeout: true });
        try {
            const response = pending.response;
            if (!response.ok) throw this.contract.error('endpoint_read_failed', `Media endpoint returned HTTP ${response.status}`);
            const bytes = await this.contract.readBoundedResponse(response, {
                maxBytes: options.maxBytes || this.maxBytes,
                expectedBytes: stat.byteLength,
                signal: pending.signal,
                onProgress: options.onProgress
            });
            this.contract.assertSignature(bytes, stat.mimeType);
            if (await this.contract.sha256(bytes) !== hash) throw this.contract.error('integrity_mismatch', 'Endpoint media payload failed SHA-256 verification');
            return new Blob([bytes], { type: stat.mimeType });
        } catch (error) {
            if (pending.signal.aborted) throw this.contract.error(options.signal?.aborted ? 'aborted' : 'endpoint_timeout', 'Media endpoint read was canceled or timed out');
            if (error?.name === 'MediaError') throw error;
            throw this.contract.error('endpoint_read_failed', 'Media endpoint read failed');
        } finally {
            pending.done();
        }
    }

    async acquire(hashValue, options = {}) {
        if (hashValue && typeof hashValue === 'object') {
            const descriptor = this.contract.descriptor(hashValue.descriptor || hashValue, { maxBytes: options.maxBytes || this.maxBytes });
            const blob = await this.open(descriptor.hash, options);
            if (blob.size !== descriptor.byteLength || this.contract.mimeType(blob.type) !== descriptor.mimeType) {
                throw this.contract.error('descriptor_mismatch', `Endpoint media ${descriptor.id} does not match its descriptor`);
            }
            return { providerId: this.id, descriptor, blob };
        }
        const hash = this.contract.hash(hashValue);
        const current = this.leases.get(hash);
        if (current) {
            current.refs++;
            return { providerId: this.id, hash, url: current.url, release: () => this.release(hash) };
        }
        if (!this.urlApi?.createObjectURL) throw this.contract.error('lease_unavailable', 'Endpoint media leases are unavailable');
        const blob = await this.open(hash, options);
        const url = this.urlApi.createObjectURL(blob);
        this.leases.set(hash, { refs: 1, url });
        return { providerId: this.id, hash, url, release: () => this.release(hash) };
    }

    release(hashValue) {
        const hash = this.contract.hash(hashValue);
        const current = this.leases.get(hash);
        if (!current) return false;
        current.refs--;
        if (current.refs <= 0) {
            try { this.urlApi?.revokeObjectURL?.(current.url); } catch (error) {}
            this.leases.delete(hash);
        }
        return true;
    }

    releaseAll() {
        for (const current of this.leases.values()) {
            try { this.urlApi?.revokeObjectURL?.(current.url); } catch (error) {}
        }
        this.leases.clear();
    }

    async remove(hashValue, options = {}) {
        const hash = this.contract.hash(hashValue);
        while (this.leases.has(hash)) this.release(hash);
        const response = await this._fetch(`media/v1/content/${hash}`, { method: 'DELETE', signal: options.signal });
        if (!response.ok && response.status !== 404) throw this.contract.error('endpoint_delete_failed', `Media endpoint returned HTTP ${response.status}`);
        return true;
    }

    close() {
        this.releaseAll();
    }
}

if (typeof window !== 'undefined') {
    window.YAWHttpMediaSource = YAWHttpMediaSource;
    window.YAWEndpointMediaStore = YAWEndpointMediaStore;
}
