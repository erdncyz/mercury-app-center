const MercuryBulkCleanup = (() => {
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const icons = () => lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
    let projects = [];
    let selected = new Set();
    let authorized = false;
    let loading = false;
    let running = false;
    let stopRequested = false;
    let confirmation = null;
    let generation = 0;
    const filters = () => ({ before: byId('cleanupBefore').value, limit: byId('cleanupLimit').value, keepLatest: byId('cleanupKeepLatest').checked });
    const currentProject = () => projects.find(project => String(project.id) === byId('cleanupProject').value);
    const controls = ['cleanupProject', 'cleanupBefore', 'cleanupLimit', 'cleanupKeepLatest', 'reloadCleanup'];

    function message(text, error = false) {
        byId('cleanupMessage').textContent = text;
        byId('cleanupMessage').hidden = !text;
        byId('cleanupMessage').classList.toggle('users-error', error);
    }

    async function verifyAdmin() {
        const response = await fetch(`${CONFIG.baseUrl}/api/check-admin`, { credentials: 'include', cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || data.isAdmin !== true) throw new Error('Administrator access is required.');
    }

    async function fetchProjects() {
        const records = [];
        let totalPages = 1;
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            const response = await fetch(`${CONFIG.baseUrl}/api/projects?page=${pageNumber}&limit=100`, { credentials: 'include', cache: 'no-store' });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.projects)) throw new Error(data.error || 'Could not load projects. Refresh and try again.');
            records.push(...data.projects);
            totalPages = Number(data.totalPages) || 1;
        }
        return records;
    }

    function updateSelection() {
        byId('cleanupSelectionCount').textContent = `${selected.size} selected`;
        byId('reviewCleanup').disabled = !authorized || loading || running || !selected.size;
        const checkAll = byId('cleanupSelectAll');
        if (checkAll) {
            const count = byId('cleanupList').querySelectorAll('[data-cleanup-id]').length;
            checkAll.checked = count > 0 && selected.size === count;
            checkAll.indeterminate = selected.size > 0 && selected.size < count;
        }
    }

    function render() {
        const project = currentProject();
        if (!project || !authorized) {
            byId('cleanupSummary').textContent = 'Select a project';
            byId('cleanupList').innerHTML = '<div class="users-empty">Select a project</div>';
            selected.clear();
            updateSelection();
            return;
        }
        const result = MercuryCleanup.candidates(project, filters());
        const validIds = new Set(result.versions.map(version => String(version.id)));
        selected = new Set([...selected].filter(id => validIds.has(id)));
        byId('cleanupSummary').textContent = `${result.versions.length} shown / ${result.eligibleCount} eligible / ${result.protectedCount} protected`;
        byId('cleanupList').innerHTML = result.versions.length ? `<table class="cleanup-table"><caption class="sr-only">Oldest releases eligible for deletion</caption><thead><tr><th><input type="checkbox" id="cleanupSelectAll" aria-label="Select all shown releases"></th><th>Version / build</th><th>Platform</th><th>Environment</th><th>Uploaded</th></tr></thead><tbody>${result.versions.map(version => `<tr><td><input type="checkbox" data-cleanup-id="${escapeHtml(version.id)}" aria-label="Select ${escapeHtml(version.version || 'External release')} ${escapeHtml(version.platform)} ${escapeHtml(version.environment || '')} ${escapeHtml(version.uploadedAt)}" ${selected.has(String(version.id)) ? 'checked' : ''}></td><td><strong>${escapeHtml(version.version || 'External release')}</strong><span>${escapeHtml(version.buildNumber ? 'Build ' + version.buildNumber : version.file || 'External link')}</span></td><td>${escapeHtml(MercuryReleases.platforms[version.platform] || version.platform)}</td><td>${escapeHtml(version.environment || 'Unspecified')}</td><td><time datetime="${escapeHtml(version.uploadedAt)}">${new Date(version.uploadedAt).toLocaleDateString('en-GB')}</time></td></tr>`).join('')}</tbody></table>` : '<div class="users-empty"><h3>No eligible releases</h3></div>';
        updateSelection();
    }

    async function load() {
        if (running) return;
        const requestGeneration = ++generation;
        loading = true;
        authorized = false;
        selected.clear();
        projects = [];
        byId('cleanupProject').innerHTML = '<option value="">Select a project</option>';
        controls.forEach(id => { byId(id).disabled = true; });
        updateSelection();
        message('');
        byId('cleanupList').setAttribute('aria-busy', 'true');
        byId('cleanupList').replaceChildren(byId('sessionLoading').querySelector('.skeleton-releases').cloneNode(true));
        try {
            await verifyAdmin();
            const data = await fetchProjects();
            if (requestGeneration !== generation) return;
            projects = data;
            authorized = true;
            byId('cleanupProject').innerHTML += projects.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join('');
            render();
        } catch (error) {
            if (requestGeneration !== generation) return;
            message(error.message, true);
            render();
        } finally {
            if (requestGeneration === generation) {
                loading = false;
                controls.forEach(id => { byId(id).disabled = !authorized && id !== 'reloadCleanup'; });
                byId('cleanupList').setAttribute('aria-busy', 'false');
                updateSelection();
                icons();
            }
        }
    }

    controls.slice(0, 4).forEach(id => byId(id).addEventListener('change', () => {
        if (running) return;
        selected.clear();
        message('');
        render();
    }));
    byId('reloadCleanup').addEventListener('click', load);
    byId('cleanupList').addEventListener('change', event => {
        if (running || !authorized) return;
        if (event.target.id === 'cleanupSelectAll') {
            byId('cleanupList').querySelectorAll('[data-cleanup-id]').forEach(checkbox => {
                checkbox.checked = event.target.checked;
                if (checkbox.checked) selected.add(checkbox.dataset.cleanupId);
                else selected.delete(checkbox.dataset.cleanupId);
            });
        } else if (event.target.dataset.cleanupId) {
            if (event.target.checked) selected.add(event.target.dataset.cleanupId);
            else selected.delete(event.target.dataset.cleanupId);
        }
        updateSelection();
    });
    byId('reviewCleanup').addEventListener('click', () => {
        const project = currentProject();
        if (!project || !authorized || running || loading || !selected.size) return;
        confirmation = { projectId: String(project.id), projectName: project.name, filters: filters(), versions: MercuryCleanup.candidates(project, filters()).versions.filter(version => selected.has(String(version.id))) };
        byId('cleanupConfirmDescription').textContent = `${confirmation.versions.length} releases from ${project.name}, uploaded ${new Date(confirmation.versions[0].uploadedAt).toLocaleDateString('en-GB')} - ${new Date(confirmation.versions.at(-1).uploadedAt).toLocaleDateString('en-GB')}. Associated files will be deleted.`;
        byId('cleanupConfirmName').value = '';
        byId('cleanupConfirmError').hidden = true;
        byId('cleanupProgress').hidden = true;
        byId('confirmCleanup').disabled = true;
        byId('bulkCleanupDialog').showModal();
        byId('cancelCleanup').focus();
    });
    byId('cleanupConfirmName').addEventListener('input', () => { byId('confirmCleanup').disabled = running || byId('cleanupConfirmName').value !== confirmation?.projectName; });
    byId('cancelCleanup').addEventListener('click', () => { if (!running) byId('bulkCleanupDialog').close(); });
    byId('bulkCleanupDialog').addEventListener('cancel', event => { if (running) event.preventDefault(); });
    byId('bulkCleanupDialog').addEventListener('close', () => { if (!byId('bulkCleanupDialog').open) confirmation = null; });
    byId('stopCleanup').addEventListener('click', () => { stopRequested = true; byId('stopCleanup').disabled = true; });
    byId('cleanupConfirmForm').addEventListener('submit', async event => {
        event.preventDefault();
        if (!confirmation || running || !authorized || byId('cleanupConfirmName').value !== confirmation.projectName) return;
        running = true;
        stopRequested = false;
        const batch = confirmation;
        const deletedIds = new Set();
        let failure = '';
        byId('confirmCleanup').disabled = true;
        byId('cancelCleanup').disabled = true;
        byId('cleanupConfirmName').disabled = true;
        byId('stopCleanup').hidden = false;
        byId('stopCleanup').disabled = false;
        byId('cleanupProgress').hidden = false;
        byId('cleanupProgress').textContent = 'Checking permissions and selected releases...';
        controls.forEach(id => { byId(id).disabled = true; });
        try {
            await verifyAdmin();
            const freshProjects = await fetchProjects();
            const fresh = freshProjects.find(project => String(project.id) === batch.projectId);
            if (!fresh || fresh.name !== batch.projectName || !MercuryCleanup.validateSelection(fresh, batch.versions, batch.filters)) throw new Error('Project or selected releases changed. Refresh and review the selection again.');
            projects = freshProjects;
            for (const version of batch.versions) {
                if (stopRequested) break;
                byId('cleanupProgress').textContent = `${deletedIds.size} / ${batch.versions.length} deleted. Processing ${version.version || version.id}...`;
                const response = await fetch(`${CONFIG.baseUrl}/api/projects/${encodeURIComponent(batch.projectId)}/versions/${encodeURIComponent(version.id)}`, { method: 'DELETE', credentials: 'include' });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'Deletion failed. Remaining releases were not processed.');
                deletedIds.add(String(version.id));
                selected.delete(String(version.id));
                fresh.versions = fresh.versions.filter(item => String(item.id) !== String(version.id));
            }
        } catch (error) {
            failure = error.message;
        } finally {
            running = false;
            controls.forEach(id => { byId(id).disabled = false; });
            byId('cancelCleanup').disabled = false;
            byId('cleanupConfirmName').disabled = false;
            byId('stopCleanup').hidden = true;
            const summary = `${deletedIds.size} deleted; ${batch.versions.length - deletedIds.size} not completed.${failure ? ' ' + failure : stopRequested ? ' Stopped.' : ''}`;
            byId('cleanupProgress').textContent = summary;
            byId('cleanupConfirmError').textContent = failure;
            byId('cleanupConfirmError').hidden = !failure;
            confirmation = null;
            byId('confirmCleanup').disabled = true;
            byId('cleanupConfirmName').value = '';
            render();
            message(summary, Boolean(failure));
            if (deletedIds.size) await showAllApps();
            if (!failure) byId('bulkCleanupDialog').close();
        }
    });
    return { load };
})();