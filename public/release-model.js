(function (root) {
    const platforms = {
        ios: 'iOS', android: 'Android', tvos: 'Apple TV',
        androidtv: 'Android TV', huawei: 'Huawei', onvotv: 'Onvo TV'
    };

    function timestamp(value) {
        return Date.parse(value) || 0;
    }

    function selectReleases(projects, filters = {}) {
        const query = String(filters.query || '').trim().toLowerCase();
        return projects.flatMap(project => (project.versions || []).map(version => ({ project, version })))
            .filter(({ project, version }) => {
                return (!filters.projectId || project.id === filters.projectId)
                    && (!filters.platform || filters.platform === 'all' || version.platform === filters.platform)
                    && (!filters.environment || filters.environment === 'all' || version.environment === filters.environment)
                    && (!query || [project.name, version.version, version.buildNumber, version.notes,
                        platforms[version.platform] || version.platform, version.environment, version.uploadedBy]
                        .some(value => String(value || '').toLowerCase().includes(query)));
            })
            .sort((first, second) => filters.sort === 'oldest'
                ? timestamp(first.version.uploadedAt) - timestamp(second.version.uploadedAt)
                : timestamp(second.version.uploadedAt) - timestamp(first.version.uploadedAt));
    }

    function selectProjects(projects, query = '') {
        const normalized = query.trim().toLowerCase();
        return projects.filter(project => project.name.toLowerCase().includes(normalized));
    }

    const model = { platforms, selectReleases, selectProjects };
    if (typeof module !== 'undefined' && module.exports) module.exports = model;
    else root.MercuryReleases = model;
})(globalThis);