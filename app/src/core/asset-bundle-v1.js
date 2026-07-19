/**
 * YOU ARE WILD ASSET BUNDLE V1
 * Code-free, presentation-neutral resource bundle validation.
 */

const YAW_ASSET_BUNDLE_V1 = {
    PACKAGE_TYPE: 'yaw-asset-bundle',
    PACKAGE_VERSION: 1,
    MAX_RESOURCES: 256,
    MAX_TOTAL_BYTES: 128 * 1024 * 1024,
    MAX_PROVENANCE_BYTES: 4096,
    MAX_PRESENTATIONS: 16,
    MAX_PRESENTATION_BYTES: 1024 * 1024,

    _text(value, field, maxLength, required = false) {
        const text = String(value || '').trim();
        if ((required && !text) || text.length > maxLength) {
            throw new Error(`Asset bundle ${field} ${required ? 'is required and ' : ''}must be at most ${maxLength} characters`);
        }
        return text;
    },

    _version(value, field = 'version') {
        const version = String(value || '').trim();
        if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
            throw new Error(`Asset bundle ${field} must use semantic versioning`);
        }
        return version;
    },

    _rating(value) {
        const rating = String(value || 'safe').trim().toLowerCase();
        if (!['safe', 'mature', 'adult'].includes(rating)) {
            throw new Error('Asset bundle contentRating must be safe, mature, or adult');
        }
        return rating;
    },

    _provenance(value, contract) {
        if (value === undefined || value === null) return {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Asset bundle provenance must be an object');
        }
        const copy = contract.serializable(value, null);
        if (!copy || JSON.stringify(copy).length > this.MAX_PROVENANCE_BYTES) {
            throw new Error(`Asset bundle provenance must be at most ${this.MAX_PROVENANCE_BYTES} encoded characters`);
        }
        return copy;
    },

    _resourceUri(value, sourceUrl, contract) {
        const raw = String(value || '').trim();
        if (!raw) throw new Error('Asset bundle resource URI is required');
        let resolved;
        try {
            resolved = sourceUrl ? new URL(raw, sourceUrl).href : new URL(raw).href;
        } catch (error) {
            throw new Error('Asset bundle resource URI is invalid');
        }
        return contract.httpUrl(resolved);
    },

    _fallback(value, contract) {
        if (value === undefined || value === null || value === '') return null;
        const resourceId = typeof value === 'string' ? value : value?.resourceId;
        return { resourceId: contract.token(resourceId, 'fallback resource id') };
    },

    _presentations(value, contract) {
        if (value === undefined || value === null) return [];
        if (!Array.isArray(value) || value.length > this.MAX_PRESENTATIONS) {
            throw new Error(`Asset bundle presentations must contain at most ${this.MAX_PRESENTATIONS} entries`);
        }
        const presentations = value.map((presentation, index) => {
            if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) {
                throw new Error(`Asset bundle presentation ${index + 1} must be an object`);
            }
            const copy = contract.serializable(presentation, null);
            if (!copy) throw new Error(`Asset bundle presentation ${index + 1} must be serializable data`);
            copy.type = contract.token(copy.type, 'presentation type');
            const version = Number(copy.version);
            if (!Number.isSafeInteger(version) || version < 1) {
                throw new Error(`Asset bundle presentation ${index + 1} version must be a positive integer`);
            }
            copy.version = version;
            return copy;
        });
        if (JSON.stringify(presentations).length > this.MAX_PRESENTATION_BYTES) {
            throw new Error(`Asset bundle presentations must be at most ${this.MAX_PRESENTATION_BYTES} encoded characters`);
        }
        return presentations;
    },

    _assertFallbackGraph(resources) {
        const byId = new Map(resources.map(resource => [resource.id, resource]));
        for (const resource of resources) {
            const fallbackId = resource.fallback?.resourceId;
            if (!fallbackId) continue;
            if (!byId.has(fallbackId)) throw new Error(`Asset bundle resource ${resource.id} references missing fallback ${fallbackId}`);
            if (fallbackId === resource.id) throw new Error(`Asset bundle resource ${resource.id} cannot fall back to itself`);
            const seen = new Set([resource.id]);
            let cursor = fallbackId;
            while (cursor) {
                if (seen.has(cursor)) throw new Error(`Asset bundle fallback cycle includes ${cursor}`);
                seen.add(cursor);
                cursor = byId.get(cursor)?.fallback?.resourceId || '';
            }
        }
    },

    normalizePackage(packageData, options = {}) {
        const contract = options.contract || YAW_MEDIA_CONTRACT;
        if (!packageData || typeof packageData !== 'object' || Array.isArray(packageData)) {
            throw new Error('Asset bundle package must be an object');
        }
        if (String(packageData.packageType || '') !== this.PACKAGE_TYPE) {
            throw new Error(`Asset bundle packageType must be ${this.PACKAGE_TYPE}`);
        }
        if (Number(packageData.packageVersion) !== this.PACKAGE_VERSION) {
            throw new Error(`Asset bundle packageVersion must be ${this.PACKAGE_VERSION}`);
        }
        const input = packageData.bundle;
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Asset bundle payload is required');
        }
        const id = contract.token(input.id, 'bundle id');
        const targetModuleId = String(input.targetModuleId || '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(targetModuleId)) {
            throw new Error('Asset bundle targetModuleId must be an installed module id');
        }
        const version = this._version(input.version);
        const license = this._text(input.license, 'license', 240, true);
        const provenance = this._provenance(input.provenance, contract);
        const presentations = this._presentations(input.presentations, contract);
        if (!Array.isArray(input.resources) || !input.resources.length || input.resources.length > this.MAX_RESOURCES) {
            throw new Error(`Asset bundle resources must contain between 1 and ${this.MAX_RESOURCES} entries`);
        }
        const seen = new Set();
        let totalByteLength = 0;
        const resources = input.resources.map((resource, index) => {
            if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
                throw new Error(`Asset bundle resource ${index + 1} must be an object`);
            }
            const resourceId = contract.token(resource.id, 'resource id');
            if (seen.has(resourceId)) throw new Error(`Duplicate asset bundle resource ${resourceId}`);
            seen.add(resourceId);
            const uri = this._resourceUri(resource.uri || resource.url, options.sourceUrl, contract);
            const fallback = this._fallback(resource.fallback, contract);
            const resourceLicense = this._text(resource.license || license, `resource ${resourceId} license`, 240, true);
            const resourceProvenance = this._provenance(resource.provenance, contract);
            const descriptor = contract.descriptor({
                id: resourceId,
                hash: resource.hash || resource.sha256,
                mimeType: resource.mimeType,
                byteLength: resource.byteLength,
                width: resource.width,
                height: resource.height,
                role: resource.role || 'media',
                license: resourceLicense,
                fallback,
                provenance: {
                    ...provenance,
                    ...resourceProvenance,
                    bundleId: id,
                    bundleVersion: version
                },
                source: { kind: 'http', url: uri }
            });
            totalByteLength += descriptor.byteLength;
            if (totalByteLength > this.MAX_TOTAL_BYTES) {
                throw new Error(`Asset bundle resources exceed the ${this.MAX_TOTAL_BYTES} byte total limit`);
            }
            return { ...descriptor, uri };
        });
        this._assertFallbackGraph(resources);
        const roles = [...new Set(resources.map(resource => resource.role))].sort();
        return {
            packageType: this.PACKAGE_TYPE,
            packageVersion: this.PACKAGE_VERSION,
            bundle: {
                id,
                targetModuleId,
                name: this._text(input.name || id, 'name', 120, true),
                version,
                description: this._text(input.description, 'description', 500),
                author: this._text(input.author, 'author', 120),
                license,
                contentRating: this._rating(input.contentRating),
                minGameVersion: input.minGameVersion ? this._version(input.minGameVersion, 'minGameVersion') : '',
                minModuleVersion: input.minModuleVersion ? this._version(input.minModuleVersion, 'minModuleVersion') : '',
                provenance,
                presentations,
                resources,
                resourceCount: resources.length,
                totalByteLength,
                roles
            }
        };
    },

    installationResources(normalizedPackage) {
        const bundle = normalizedPackage?.bundle;
        if (!bundle?.resources) throw new Error('Normalized asset bundle is required');
        return bundle.resources.map(resource => ({
            url: resource.uri,
            descriptor: {
                id: resource.id,
                hash: resource.hash,
                mimeType: resource.mimeType,
                byteLength: resource.byteLength,
                width: resource.width,
                height: resource.height,
                role: resource.role,
                license: resource.license,
                provenance: resource.provenance,
                fallback: resource.fallback,
                source: resource.source
            }
        }));
    },

    ownerMetadata(normalizedPackage, review = {}) {
        const bundle = normalizedPackage.bundle;
        return {
            kind: 'asset_bundle_v1',
            bundleId: bundle.id,
            name: bundle.name,
            version: bundle.version,
            description: bundle.description,
            author: bundle.author,
            license: bundle.license,
            contentRating: bundle.contentRating,
            targetModuleId: bundle.targetModuleId,
            minGameVersion: bundle.minGameVersion,
            minModuleVersion: bundle.minModuleVersion,
            provenance: bundle.provenance,
            resourceCount: bundle.resourceCount,
            resourceIds: bundle.resources.map(resource => resource.id),
            totalByteLength: bundle.totalByteLength,
            roles: bundle.roles,
            presentations: bundle.presentations,
            sourceUrl: String(review.sourceUrl || ''),
            integrity: String(review.integrity || ''),
            integrityVerified: review.integrityVerified === true,
            installedAt: Date.now()
        };
    }
};

if (typeof window !== 'undefined') window.YAW_ASSET_BUNDLE_V1 = YAW_ASSET_BUNDLE_V1;
