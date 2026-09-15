const MercuryWorkspace = (() => {
    const state = { projects: [], projectId: '', environment: 'all', page: 1, canManage: false, pending: null, generation: 0 };
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
    const icons = () => lucide.createIcons({ attrs: { 'aria-hidden': 'true', 'stroke-width': 1.7 } });
    const count = value => value.toLocaleString('en-GB');
    const platformName = platform => MercuryReleases.platforms[platform] || platform || 'Unknown';
    const platformIcon = platform => ['tvos', 'androidtv', 'onvotv'].includes(platform) ? 'tv' : platform === 'huawei' ? 'globe' : 'smartphone';
    const environmentName = environment => ({ production: 'Production', test: 'Test', regression: 'Regression' }[environment] || environment || 'Unspecified');
    const environmentClass = environment => ['production', 'test', 'regression'].includes(environment) ? environment : 'unspecified';
    const versionName = version => version.version ? `${/^v/i.test(version.version) ? '' : 'v'}${version.version}` : version.url ? 'TestFlight' : 'Unversioned';
    const dateLabel = date => Number.isNaN(Date.parse(date)) ? 'Unknown date' : new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const favoriteKey = () => `mercury.favorites.${localStorage.getItem('username') || ''}`;

    function favorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(favoriteKey()) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch { return []; }
    }

    function projectBadge(project) {
        const tone = [...project.name].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
        const initials = project.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2);
        return `<span class="project-avatar tone-${tone}" aria-hidden="true">${escapeHtml(initials)}</span>`;
    }

    function safeUrl(value) {
        try {
            const url = new URL(value);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
        } catch { return null; }
    }

    function route(releaseId = '', replace = false) {
        const parameters = new URLSearchParams();
        if (state.projectId) parameters.set('project', state.projectId);
        if (releaseId) parameters.set('release', releaseId);
        history[replace ? 'replaceState' : 'pushState']({}, '', `${location.pathname}${location.search}${parameters.size ? '#' + parameters : ''}`);
    }

    function renderProjects() {
        const saved = favorites();
        const projects = MercuryReleases.selectProjects(state.projects, byId('projectSearch').value)
            .sort((first, second) => Number(saved.includes(second.id)) - Number(saved.includes(first.id)) || first.name.localeCompare(second.name));
        byId('projectTotal').textContent = state.projects.length;
        byId('allProjectsButton').setAttribute('aria-current', state.projectId ? 'false' : 'page');
        byId('projectList').innerHTML = projects.length ? projects.map(project => `
            <div class="project-nav-item ${state.projectId === project.id ? 'selected' : ''}">
                <button class="project-link" data-project="${escapeHtml(project.id)}" ${state.projectId === project.id ? 'aria-current="page"' : ''}>
                    ${projectBadge(project)}<span class="project-nav-copy"><strong>${escapeHtml(project.name)}</strong><span>${count((project.versions || []).length)} releases</span></span>
                </button>
                <button class="favorite-button ${saved.includes(project.id) ? 'is-favorite' : ''}" data-favorite="${escapeHtml(project.id)}" aria-pressed="${saved.includes(project.id)}" aria-label="${saved.includes(project.id) ? 'Unpin' : 'Pin'} ${escapeHtml(project.name)}" title="${saved.includes(project.id) ? 'Unpin project' : 'Pin project'}">${icon('star')}</button>
            </div>`).join('') : '<p class="sidebar-empty">No projects found.</p>';
        icons();
    }

    function currentFilters() {
        return { projectId: state.projectId, query: byId('searchInput').value, platform: byId('osFilter').value,
            environment: state.environment, sort: byId('releaseSort').value };
    }

    function primaryAction(project, version) {
        if (version.url) {
            const url = safeUrl(version.url);
            return url ? `<a class="release-download" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(project.name)} ${escapeHtml(versionName(version))} in a new tab">${icon('external-link')}<span>Open link</span></a>` : '<span class="unavailable">Invalid link</span>';
        }
        return version.file ? `<button class="release-download" data-download="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}" aria-label="Download ${escapeHtml(project.name)} ${escapeHtml(versionName(version))}">${icon('download')}<span>Download</span></button>` : '<span class="unavailable">No file</span>';
    }

    function render() {
        const selected = state.projects.find(project => project.id === state.projectId);
        const scopedProjects = selected ? [selected] : state.projects;
        const total = scopedProjects.reduce((sum, project) => sum + (project.versions || []).length, 0);
        byId('workspaceTitle').textContent = selected ? selected.name : 'All releases';
        byId('mobileProjectName').textContent = selected ? selected.name : 'All releases';
        byId('workspaceSummary').textContent = `${selected ? 'Project' : `${count(state.projects.length)} projects`} / ${count(total)} releases`;
        byId('uploadSelected').hidden = !selected || !state.canManage;
        byId('deleteSelected').hidden = !selected || !state.canManage;

        const filters = currentFilters();
        const releases = MercuryReleases.selectReleases(state.projects, filters);
        const pageSize = Number(byId('pageSize').value);
        const pages = Math.max(1, Math.ceil(releases.length / pageSize));
        state.page = Math.min(state.page, pages);
        const offset = (state.page - 1) * pageSize;
        const visible = releases.slice(offset, offset + pageSize);
        byId('resultCount').textContent = `${count(releases.length)} ${releases.length === 1 ? 'release' : 'releases'}`;
        byId('resetFilters').hidden = !filters.query && filters.platform === 'all' && state.environment === 'all';
        byId('clearSearch').hidden = !filters.query;
        byId('platformFilters').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button.dataset.platform === filters.platform));
        byId('environmentFilters').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button.dataset.environment === state.environment));
        const latest = new Set();
        const latestIds = new Set();
        MercuryReleases.selectReleases(scopedProjects).forEach(({ project, version }) => {
            const key = JSON.stringify([project.id, version.platform, version.environment]);
            if (!latest.has(key)) { latest.add(key); latestIds.add(version.id); }
        });
        byId('allApps').setAttribute('aria-busy', 'false');
        byId('allApps').innerHTML = visible.length ? `
            <div class="release-table-scroll"><table class="release-table"><caption class="sr-only">${escapeHtml(byId('workspaceTitle').textContent)} releases</caption>
                <thead><tr><th scope="col">Version / build</th><th scope="col">Project</th><th scope="col">Platform</th><th scope="col">Environment</th><th scope="col">Uploaded</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
                <tbody>${visible.map(({ project, version }) => `
                    <tr>
                        <td data-label="Version"><button class="release-name" title="${escapeHtml(versionName(version))}" data-details="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}"><span class="release-title-text">${escapeHtml(versionName(version))}</span><span class="build-number">${version.buildNumber ? 'Build ' + escapeHtml(version.buildNumber) : version.url ? 'External distribution' : 'Release'}${latestIds.has(version.id) ? '<span class="latest-badge">Latest</span>' : ''}</span></button></td>
                        <td data-label="Project"><button class="table-project" data-select-project="${escapeHtml(project.id)}">${projectBadge(project)}<span>${escapeHtml(project.name)}</span></button></td>
                        <td data-label="Platform"><span class="platform-label">${icon(platformIcon(version.platform))}${escapeHtml(platformName(version.platform))}</span></td>
                        <td data-label="Environment"><span class="environment-badge ${environmentClass(version.environment)}"><span class="status-dot"></span>${escapeHtml(environmentName(version.environment))}</span></td>
                        <td data-label="Uploaded"><time datetime="${escapeHtml(version.uploadedAt || '')}">${escapeHtml(dateLabel(version.uploadedAt))}</time></td>
                        <td class="release-row-actions">${primaryAction(project, version)}<button class="icon-button" data-details="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}" aria-label="Details for ${escapeHtml(project.name)} ${escapeHtml(versionName(version))}" title="Release details">${icon('chevron-right')}</button></td>
                    </tr>`).join('')}</tbody></table></div>` : `
            <div class="workspace-empty">${icon(total ? 'search-x' : 'package-open')}<h3>${total ? 'No matching releases' : 'No releases yet'}</h3>${total ? '<button data-reset class="secondary-action">Clear filters</button>' : ''}</div>`;
        byId('releasePagination').hidden = !releases.length;
        byId('pageRange').textContent = `${count(offset + 1)}-${count(Math.min(offset + pageSize, releases.length))} of ${count(releases.length)}`;
        byId('pageNumber').textContent = `${state.page} / ${pages}`;
        byId('previousPage').disabled = state.page <= 1;
        byId('nextPage').disabled = state.page >= pages;
        icons();
    }

    function resetFilters() {
        byId('searchInput').value = '';
        byId('osFilter').value = 'all';
        state.environment = 'all';
        state.page = 1;
        render();
    }

    function selectProject(projectId) {
        if (byId('releaseDetails').open) byId('releaseDetails').close();
        state.projectId = projectId;
        state.page = 1;
        resetFilters();
        renderProjects();
        route();
        if (byId('projectMenuToggle').getAttribute('aria-expanded') === 'true') {
            byId('projectMenuToggle').setAttribute('aria-expanded', 'false');
            byId('projectSidebar').classList.remove('is-open');
            byId('projectMenuToggle').focus();
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function showDetails(projectId, versionId, updateRoute = true) {
        const project = state.projects.find(item => item.id === projectId);
        const version = project?.versions?.find(item => item.id === versionId);
        if (!version) { showNotification('This release is no longer available.', 'error'); return; }
        byId('releaseDetailsBody').innerHTML = `
            <div class="detail-project">${projectBadge(project)}<span>${escapeHtml(project.name)}</span></div>
            <h2 id="releaseDetailsTitle">${escapeHtml(versionName(version))}</h2>
            <div class="detail-badges"><span class="platform-label">${icon(platformIcon(version.platform))}${escapeHtml(platformName(version.platform))}</span><span class="environment-badge ${environmentClass(version.environment)}"><span class="status-dot"></span>${escapeHtml(environmentName(version.environment))}</span></div>
            <div class="detail-primary-actions">${primaryAction(project, version)}<button class="secondary-action" data-copy="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}">${icon('link')}Copy link</button></div>
            <dl class="detail-metadata"><div><dt>Build number</dt><dd>${escapeHtml(version.buildNumber || 'Not specified')}</dd></div><div><dt>Uploaded</dt><dd>${escapeHtml(dateLabel(version.uploadedAt))}</dd></div><div><dt>Uploaded by</dt><dd>${escapeHtml(version.uploadedBy || 'Unknown')}</dd></div><div><dt>File</dt><dd>${escapeHtml(version.file || 'External link')}</dd></div></dl>
            <section class="release-notes"><h3>Release notes</h3><p>${escapeHtml(version.notes || 'No release notes provided.')}</p></section>
            ${state.canManage ? `<div class="detail-admin-actions"><button class="secondary-action" data-edit="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}">${icon('pencil')}Edit release</button><button class="danger-action" data-delete="${escapeHtml(version.id)}" data-project="${escapeHtml(project.id)}">${icon('trash-2')}Delete release</button></div>` : ''}`;
        icons();
        if (!byId('releaseDetails').open) byId('releaseDetails').showModal();
        if (updateRoute) {
            const parameters = new URLSearchParams({ project: projectId, release: versionId });
            history.pushState({}, '', `${location.pathname}${location.search}#${parameters}`);
        }
    }

    function readRoute() {
        const parameters = new URLSearchParams(location.hash.slice(1));
        const projectId = parameters.get('project');
        state.projectId = state.projects.some(project => project.id === projectId) ? projectId : '';
        state.page = 1;
        renderProjects();
        render();
        if (parameters.has('release')) showDetails(state.projectId, parameters.get('release'), false);
        else if (byId('releaseDetails').open) byId('releaseDetails').close();
    }

    function showLoading() {
        byId('allApps').setAttribute('aria-busy', 'true');
        byId('allApps').replaceChildren(byId('sessionLoading').querySelector('.skeleton-releases').cloneNode(true));
        byId('resultCount').textContent = 'Loading releases...';
        byId('releasePagination').hidden = true;
        if (!state.projects.length) {
            byId('projectList').replaceChildren(byId('sessionLoading').querySelector('.skeleton-projects').cloneNode(true));
            byId('projectList').setAttribute('aria-busy', 'true');
        }
    }

    async function load() {
        if (state.pending) return state.pending;
        const generation = state.generation;
        byId('refreshProjects').disabled = true;
        showLoading();
        icons();
        state.pending = (async () => {
            try {
                const projects = [];
                let pageNumber = 1;
                let totalPages = 1;
                const adminResponse = await fetch(`${CONFIG.baseUrl}/api/check-admin`, { credentials: 'include' });
                const admin = await adminResponse.json();
                do {
                    const response = await fetch(`${CONFIG.baseUrl}/api/projects?page=${pageNumber}&limit=100`, { credentials: 'include' });
                    if (response.status === 401 || response.status === 403) {
                        reset();
                        byId('mainContainer').style.display = 'none';
                        byId('loginContainer').style.display = 'flex';
                        showLoginError('Your session has expired. Please sign in again.');
                        return;
                    }
                    if (!response.ok) throw new Error('Unable to load releases. Please try again.');
                    const data = await response.json();
                    if (!Array.isArray(data.projects)) throw new Error('Unexpected project response. Please try again.');
                    projects.push(...data.projects);
                    totalPages = Number(data.totalPages) || 1;
                    pageNumber += 1;
                } while (pageNumber <= totalPages);
                if (generation !== state.generation) return;
                state.projects = [...new Map(projects.map(project => [project.id, project])).values()];
                state.canManage = adminResponse.ok && admin.isAdmin === true;
                const selectedStillExists = state.projects.some(project => project.id === state.projectId);
                if (!selectedStillExists) state.projectId = '';
                if (location.hash) readRoute();
                else { renderProjects(); render(); }
            } catch (error) {
                if (generation !== state.generation) return;
                renderProjects();
                byId('resultCount').textContent = 'Could not refresh releases';
                byId('allApps').innerHTML = `<div class="workspace-empty" role="alert">${icon('wifi-off')}<h3>Releases unavailable</h3><p>${escapeHtml(error.message)}</p><button data-retry class="secondary-action">${icon('refresh-cw')}Try again</button></div>`;
                byId('releasePagination').hidden = true;
            } finally {
                if (generation === state.generation) {
                    state.pending = null;
                    byId('refreshProjects').disabled = false;
                    byId('allApps').setAttribute('aria-busy', 'false');
                    byId('projectList').setAttribute('aria-busy', 'false');
                    icons();
                }
            }
        })();
        return state.pending;
    }

    function reset() {
        state.generation += 1;
        state.projects = [];
        state.projectId = '';
        state.canManage = false;
        state.pending = null;
        byId('refreshProjects').disabled = false;
        if (byId('releaseDetails').open) byId('releaseDetails').close();
        byId('releaseDetailsBody').replaceChildren();
        renderProjects();
        resetFilters();
    }

    async function onReleaseAction(event) {
        const target = event.target.closest('button, a');
        if (!target) return;
        const projectId = target.dataset.project;
        if (target.dataset.details) showDetails(projectId, target.dataset.details);
        if (target.dataset.selectProject) selectProject(target.dataset.selectProject);
        if (target.dataset.download) await downloadVersion(projectId, target.dataset.download, target);
        if (target.hasAttribute('data-reset')) resetFilters();
        if (target.hasAttribute('data-retry')) await load();
        if (target.dataset.edit) {
            byId('releaseDetails').close();
            editVersion(projectId, target.dataset.edit);
        }
        if (target.dataset.delete) {
            byId('releaseDetails').close();
            deleteVersion(projectId, target.dataset.delete);
        }
        if (target.dataset.copy) {
            const url = new URL(location.href);
            url.hash = new URLSearchParams({ project: projectId, release: target.dataset.copy });
            try { await navigator.clipboard.writeText(url.href); showNotification('Release link copied'); }
            catch { showNotification('Could not copy the link. Copy the address from your browser.', 'error'); }
        }
    }

    byId('projectList').addEventListener('click', event => {
        const pin = event.target.closest('[data-favorite]');
        if (pin) {
            const saved = favorites();
            const projectId = pin.dataset.favorite;
            const selected = saved.includes(projectId);
            try { localStorage.setItem(favoriteKey(), JSON.stringify(selected ? saved.filter(id => id !== projectId) : [...saved, projectId])); }
            catch { showNotification('Could not save your pinned projects.', 'error'); }
            renderProjects();
            [...byId('projectList').querySelectorAll('[data-favorite]')].find(button => button.dataset.favorite === projectId)?.focus();
            return;
        }
        const project = event.target.closest('[data-project]');
        if (project) selectProject(project.dataset.project);
    });
    byId('allProjectsButton').addEventListener('click', () => selectProject(''));
    byId('projectSearch').addEventListener('input', renderProjects);
    byId('refreshProjects').addEventListener('click', load);
    byId('searchInput').addEventListener('input', () => { state.page = 1; render(); });
    byId('clearSearch').addEventListener('click', () => { byId('searchInput').value = ''; state.page = 1; render(); byId('searchInput').focus(); });
    byId('environmentFilters').addEventListener('click', event => {
        const target = event.target.closest('[data-environment]');
        if (target) { state.environment = target.dataset.environment; state.page = 1; render(); }
    });
    byId('platformFilters').addEventListener('click', event => {
        const target = event.target.closest('[data-platform]');
        if (target) { byId('osFilter').value = target.dataset.platform; state.page = 1; render(); }
    });
    ['releaseSort', 'pageSize'].forEach(id => byId(id).addEventListener('change', () => { state.page = 1; render(); }));
    byId('resetFilters').addEventListener('click', resetFilters);
    byId('previousPage').addEventListener('click', () => { state.page -= 1; render(); });
    byId('nextPage').addEventListener('click', () => { state.page += 1; render(); });
    byId('allApps').addEventListener('click', onReleaseAction);
    byId('releaseDetailsBody').addEventListener('click', onReleaseAction);
    byId('closeReleaseDetails').addEventListener('click', () => byId('releaseDetails').close());
    byId('releaseDetails').addEventListener('click', event => { if (event.target === byId('releaseDetails')) byId('releaseDetails').close(); });
    byId('releaseDetails').addEventListener('close', () => { if (new URLSearchParams(location.hash.slice(1)).has('release')) route('', true); });
    byId('uploadSelected').addEventListener('click', () => {
        const project = state.projects.find(item => item.id === state.projectId);
        if (project && state.canManage) openUploadModal(project.id, project.name);
    });
    byId('deleteSelected').addEventListener('click', () => { if (state.canManage && state.projectId) deleteProject(state.projectId); });
    byId('projectMenuToggle').addEventListener('click', () => {
        const expanded = byId('projectMenuToggle').getAttribute('aria-expanded') !== 'true';
        byId('projectMenuToggle').setAttribute('aria-expanded', expanded);
        byId('projectSidebar').classList.toggle('is-open', expanded);
    });
    window.addEventListener('popstate', () => { if (state.projects.length) readRoute(); });
    showLoading();
    icons();
    return { load, reset, filter: () => { state.page = 1; render(); } };
})();

window.showAllApps = MercuryWorkspace.load;
window.filterUploads = MercuryWorkspace.filter;
window.showRecentUploads = MercuryWorkspace.load;