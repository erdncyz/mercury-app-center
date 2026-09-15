(() => {
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
    const refreshIcons = () => lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
    let users = [];
    let pageNumber = 1;
    let loading = false;
    let deleting = false;
    let selectedUser = null;
    const pageSize = 15;
    const isSelf = user => String(user.username).toLowerCase() === String(localStorage.getItem('username')).toLowerCase();
    const action = (name, label, user, disabled = false) => `<button type="button" class="icon-button user-action ${name === 'delete' ? 'user-delete' : ''}" data-user-action="${name}" data-user-id="${escapeHtml(user.id)}" aria-label="${escapeHtml(label)}: ${escapeHtml(user.username)}" title="${escapeHtml(label)}" ${disabled ? 'disabled' : ''}>${icon({ delete: 'trash-2', approve: 'user-round-check', revoke: 'user-round-minus', promote: 'shield-plus', demote: 'shield-minus', projects: 'folder-key' }[name])}</button>`;

    function renderUsers() {
        const query = byId('userSearch').value.trim().toLowerCase();
        const status = byId('userStatusFilter').value;
        const filtered = users.filter(user => {
            const matchesStatus = status === 'all' || (status === 'pending' && !user.approved) || (status === 'approved' && user.approved) || (status === 'admin' && user.role === 'admin');
            const text = [user.username, user.fullName, user.email, ...(user.projects || []).map(project => project.name)].join(' ').toLowerCase();
            return matchesStatus && (!query || text.includes(query));
        }).sort((first, second) => Number(Boolean(first.approved)) - Number(Boolean(second.approved)) || String(first.username).localeCompare(String(second.username)));
        const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
        pageNumber = Math.min(pageNumber, pages);
        const offset = (pageNumber - 1) * pageSize;
        byId('usersSummary').textContent = `${users.length} users / ${users.filter(user => !user.approved).length} pending approval`;
        byId('usersList').innerHTML = filtered.length ? `<div class="users-table-scroll"><table class="users-table"><caption class="sr-only">User accounts and access</caption><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Projects</th><th scope="col">Actions</th></tr></thead><tbody>${filtered.slice(offset, offset + pageSize).map(user => {
            const self = isSelf(user);
            const projects = (user.projects || []).map(project => project.name).join(', ');
            return `<tr><td data-label="User"><div class="user-identity"><span class="user-avatar" aria-hidden="true">${escapeHtml(String(user.fullName || user.username).slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(user.fullName || user.username)}${self ? '<span class="user-you">You</span>' : ''}</strong><span class="user-handle">${escapeHtml(user.username)}</span>${user.email ? `<span class="user-email-text">${escapeHtml(user.email)}</span>` : ''}</div></div></td><td data-label="Role"><span class="user-role-badge">${icon(user.role === 'admin' ? 'shield-check' : 'user-round')}${user.role === 'admin' ? 'Admin' : 'User'}</span></td><td data-label="Status"><span class="user-status-badge ${user.approved ? 'approved' : 'pending'}"><span class="status-dot"></span>${user.approved ? 'Approved' : 'Pending'}</span></td><td data-label="Projects"><span class="user-project-names">${user.role === 'admin' ? 'All projects' : escapeHtml(projects || 'No projects assigned')}</span></td><td class="user-row-actions">${action(user.approved ? 'revoke' : 'approve', user.approved ? 'Revoke access' : 'Approve user', user, self)}${user.approved ? action(user.role === 'admin' ? 'demote' : 'promote', user.role === 'admin' ? 'Remove admin role' : 'Make administrator', user, self) : ''}${user.approved && user.role !== 'admin' ? action('projects', 'Manage projects', user, self) : ''}${action('delete', self ? 'You cannot delete your own account' : 'Delete user', user, self)}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="users-empty">${icon('users-round')}<h3>${users.length ? 'No matching users' : 'No users yet'}</h3>${users.length ? '<button type="button" data-reset-users>Clear filters</button>' : ''}</div>`;
        byId('usersPagination').hidden = !filtered.length;
        byId('usersRange').textContent = `${offset + 1}-${Math.min(offset + pageSize, filtered.length)} of ${filtered.length}`;
        byId('usersPage').textContent = `${pageNumber} / ${pages}`;
        byId('usersPrevious').disabled = pageNumber === 1;
        byId('usersNext').disabled = pageNumber === pages;
        refreshIcons();
    }

    async function loadUsers() {
        if (loading) return;
        loading = true;
        byId('refreshUsers').disabled = true;
        byId('usersList').setAttribute('aria-busy', 'true');
        byId('usersList').replaceChildren(byId('sessionLoading').querySelector('.skeleton-releases').cloneNode(true));
        byId('usersPagination').hidden = true;
        try {
            const response = await fetch(`${CONFIG.baseUrl}/api/users`, { credentials: 'include' });
            if (!response.ok) throw new Error(response.status === 403 ? 'Administrator access is required.' : 'Could not load users. Try again.');
            const data = await response.json();
            if (!Array.isArray(data.users)) throw new Error('Could not load users. Try again.');
            users = data.users;
            window.allUsersData = users;
            renderUsers();
        } catch (error) {
            users = [];
            window.allUsersData = [];
            byId('usersSummary').textContent = 'Users unavailable';
            byId('usersList').innerHTML = `<div class="users-empty" role="alert"><h3>${escapeHtml(error.message)}</h3><button type="button" data-retry-users>${icon('refresh-cw')}Try again</button></div>`;
        } finally {
            loading = false;
            byId('refreshUsers').disabled = false;
            byId('usersList').setAttribute('aria-busy', 'false');
            refreshIcons();
        }
    }

    function confirmDeletion(user) {
        if (isSelf(user) || deleting) return;
        selectedUser = user;
        byId('deleteUserIdentity').textContent = user.username;
        byId('deleteUserConfirmName').value = '';
        byId('confirmDeleteUser').disabled = true;
        byId('deleteUserError').hidden = true;
        byId('deleteUserDialog').showModal();
        byId('cancelDeleteUser').focus();
        refreshIcons();
    }

    byId('deleteUserConfirmName').addEventListener('input', () => {
        byId('confirmDeleteUser').disabled = deleting || byId('deleteUserConfirmName').value !== selectedUser?.username;
    });
    byId('cancelDeleteUser').addEventListener('click', () => { if (!deleting) byId('deleteUserDialog').close(); });
    byId('deleteUserDialog').addEventListener('cancel', event => { if (deleting) event.preventDefault(); });
    byId('deleteUserDialog').addEventListener('close', () => { selectedUser = null; });
    byId('deleteUserForm').addEventListener('submit', async event => {
        event.preventDefault();
        if (deleting || !selectedUser || isSelf(selectedUser) || byId('deleteUserConfirmName').value !== selectedUser.username) return;
        deleting = true;
        byId('confirmDeleteUser').disabled = true;
        byId('cancelDeleteUser').disabled = true;
        byId('deleteUserConfirmName').disabled = true;
        byId('deleteUserError').hidden = true;
        byId('confirmDeleteUser').textContent = 'Deleting...';
        try {
            const response = await fetch(`${CONFIG.baseUrl}/api/users/${encodeURIComponent(selectedUser.id)}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Could not delete user. Try again.');
            byId('deleteUserDialog').close();
            showNotification('User deleted successfully', 'success');
            await loadUsers();
        } catch (error) {
            byId('deleteUserError').textContent = error.message;
            byId('deleteUserError').hidden = false;
        } finally {
            deleting = false;
            byId('confirmDeleteUser').textContent = 'Delete user';
            byId('cancelDeleteUser').disabled = false;
            byId('deleteUserConfirmName').disabled = false;
            byId('confirmDeleteUser').disabled = byId('deleteUserConfirmName').value !== selectedUser?.username;
        }
    });

    byId('usersList').addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button || button.disabled) return;
        if (button.hasAttribute('data-retry-users')) return loadUsers();
        if (button.hasAttribute('data-reset-users')) {
            byId('userSearch').value = '';
            byId('userStatusFilter').value = 'all';
            pageNumber = 1;
            renderUsers();
            return;
        }
        const user = users.find(item => String(item.id) === button.dataset.userId);
        if (!user || isSelf(user)) return;
        const actionName = button.dataset.userAction;
        if (actionName === 'delete') return confirmDeletion(user);
        if (actionName === 'projects') return showManageProjectsModal(user.id);
        button.disabled = true;
        try {
            if (actionName === 'approve' || actionName === 'revoke') await updateUserApproval(user.id, actionName === 'approve');
            if (actionName === 'promote' || actionName === 'demote') await updateUserRole(user.id, actionName === 'promote' ? 'admin' : 'user');
        } finally { button.disabled = false; }
    });
    byId('refreshUsers').addEventListener('click', loadUsers);
    byId('userSearch').addEventListener('input', () => { if (!loading) { pageNumber = 1; renderUsers(); } });
    byId('userStatusFilter').addEventListener('change', () => { if (!loading) { pageNumber = 1; renderUsers(); } });
    byId('usersPrevious').addEventListener('click', () => { pageNumber -= 1; renderUsers(); });
    byId('usersNext').addEventListener('click', () => { pageNumber += 1; renderUsers(); });
    window.loadUsers = loadUsers;
    window.deleteUser = userId => { const user = users.find(item => String(item.id) === String(userId)); if (user) confirmDeletion(user); };
    refreshIcons();
})();