(function() {
    'use strict';
    window.toolbar = window.toolbar || {};
    window.rightPanelVisible = true;
    const SETTINGS_PATH = 'System:Preferences/Settings/Acaret.info';

    function toolbarKey(button) { return button.id.replace(/^tab_/, ''); }

    function setRightPanelWidth(width) {
        const min = 220;
        const max = Math.max(min, Math.floor(window.innerWidth * 0.65));
        const value = Math.max(min, Math.min(max, Math.round(Number(width) || 449)));
        document.documentElement.style.setProperty('--right-panel-width', value + 'px');
        window.resizeAllEditors && window.resizeAllEditors();
        return value;
    }
    window.setRightPanelWidth = setRightPanelWidth;

    async function loadSettings() {
        try {
            const settings = JSON.parse(await window.kinReadFile(SETTINGS_PATH));
            setRightPanelWidth(settings.rightPanelWidth);
        } catch (_e) { setRightPanelWidth(449); }
    }

    async function savePanelWidth(width) {
        try { await window.kinWriteFile(SETTINGS_PATH, JSON.stringify({ schema: 1, rightPanelWidth: width }, null, 2)); }
        catch (_e) { /* preference persistence must not block editing */ }
    }

    function showRightPanel() {
        window.rightPanelVisible = true;
        document.body.classList.remove('right-panel-collapsed');
        window.resizeAllEditors && window.resizeAllEditors();
    }
    function hideRightPanel() {
        window.rightPanelVisible = false;
        document.body.classList.add('right-panel-collapsed');
        window.resizeAllEditors && window.resizeAllEditors();
    }

    function activateTab(button, buttons, isRight) {
        if (isRight && button.classList.contains('active')) {
            if (window.rightPanelVisible) hideRightPanel(); else showRightPanel();
            return;
        }
        if (isRight) showRightPanel();
        buttons.forEach(function(other) {
            const page = document.getElementById(other.id.replace('tab_', 'page_'));
            const active = other === button;
            other.classList.toggle('active', active);
            if (page) page.classList.toggle('active', active);
        });
        const handler = window.toolbar[toolbarKey(button)];
        if (handler) handler();
        window.resizeAllEditors && window.resizeAllEditors();
    }

    function initTabs(containerId, defaultId) {
        const container = document.getElementById(containerId);
        const buttons = Array.from(container.querySelectorAll('button[id^="tab_"]'));
        const isRight = containerId === 'rightbar';
        buttons.forEach(function(button) {
            button.addEventListener('click', function() { activateTab(button, buttons, isRight); });
        });
        const initial = document.getElementById(defaultId) || buttons[0];
        if (initial) {
            buttons.forEach(function(button) { button.classList.remove('active'); });
            activateTab(initial, buttons, isRight);
        }
    }

    function initResizer() {
        const resizer = document.getElementById('right-panel-resizer');
        let dragging = false, startX = 0, startWidth = 449;
        resizer.addEventListener('mousedown', function(event) {
            if (!window.rightPanelVisible) return;
            dragging = true; startX = event.clientX;
            startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--right-panel-width'), 10) || 449;
            document.body.classList.add('right-panel-resizing'); event.preventDefault();
        });
        document.addEventListener('mousemove', function(event) {
            if (dragging) setRightPanelWidth(startWidth + startX - event.clientX);
        });
        document.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false; document.body.classList.remove('right-panel-resizing');
            const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--right-panel-width'), 10);
            void savePanelWidth(width);
        });
    }

    window.initializeGUI = function() {
        initTabs('leftbar', 'tab_editor');
        initTabs('rightbar', 'tab_folders');
        initResizer(); void loadSettings();
        window.registerKinMenus();
        window.refreshFolderStructure('Home:');
        if (window.kin && kin.api && typeof kin.api.onPeerMessage === 'function') {
            kin.api.onPeerMessage('acaret.project-created', function(payload) {
                if (payload && window.applyCreatedProject) window.applyCreatedProject(payload);
            });
        }
    };

    window.showContextMenu = function(items, event) {
        document.querySelectorAll('.mlContextMenu').forEach(function(menu) { menu.remove(); });
        const menu = document.createElement('div'); menu.className = 'mlContextMenu';
        (items || []).forEach(function(item) {
            const row = document.createElement('button'); row.type = 'button'; row.className = 'menu-item'; row.textContent = item.name;
            row.addEventListener('click', async function(clickEvent) {
                menu.remove(); clickEvent.stopPropagation();
                if (!item.action) return;
                try { await item.action(); }
                catch (error) { await window.kinAlert(error.message || String(error), { title: 'Acaret' }); }
            });
            menu.appendChild(row);
        });
        menu.style.top = event.clientY + 'px'; menu.style.left = event.clientX + 'px'; document.body.appendChild(menu);
        setTimeout(function() {
            document.addEventListener('mousedown', function close(outside) {
                if (!menu.contains(outside.target)) { menu.remove(); document.removeEventListener('mousedown', close); }
            });
        }, 0);
    };

    document.addEventListener('contextmenu', function(event) {
        const target = event.target.closest('.folder, .file');
        if (!target || !target.contextMenu) return;
        event.preventDefault(); window.showContextMenu(target.contextMenu, event);
    });
})();
