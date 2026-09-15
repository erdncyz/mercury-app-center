(function (root) {
    function candidates(project, { before = '', limit = 20, keepLatest = true } = {}) {
        const versions = [...(project?.versions || [])].filter(version => Number.isFinite(Date.parse(version.uploadedAt)));
        const protectedIds = new Set();
        if (keepLatest) {
            const groups = new Map();
            for (const version of versions) {
                const key = JSON.stringify([version.platform, version.environment || '']);
                groups.set(key, Math.max(groups.get(key) ?? -Infinity, Date.parse(version.uploadedAt)));
            }
            for (const version of versions) {
                const key = JSON.stringify([version.platform, version.environment || '']);
                if (Date.parse(version.uploadedAt) === groups.get(key)) protectedIds.add(String(version.id));
            }
        }
        const cutoff = before ? new Date(`${before}T00:00:00`).getTime() : Infinity;
        const eligible = versions.filter(version => !protectedIds.has(String(version.id)) && Date.parse(version.uploadedAt) < cutoff)
            .sort((first, second) => Date.parse(first.uploadedAt) - Date.parse(second.uploadedAt) || String(first.id).localeCompare(String(second.id)));
        return { versions: eligible.slice(0, Math.min(100, Math.max(1, Number(limit) || 20))), eligibleCount: eligible.length, protectedCount: protectedIds.size };
    }

    function fingerprint(version) {
        return JSON.stringify([String(version.id), version.version, version.buildNumber, version.platform, version.environment, version.uploadedAt, version.file, version.url]);
    }

    function validateSelection(project, selection, filters) {
        const eligible = new Map(candidates(project, { ...filters, limit: 100 }).versions.map(version => [String(version.id), fingerprint(version)]));
        return selection.length > 0 && selection.every(version => eligible.get(String(version.id)) === fingerprint(version));
    }

    const model = { candidates, fingerprint, validateSelection };
    if (typeof module !== 'undefined' && module.exports) module.exports = model;
    else root.MercuryCleanup = model;
})(globalThis);