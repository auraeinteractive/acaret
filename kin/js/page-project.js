(function() {
    'use strict';
    const defaultTranslations = function() {
        return { languages: { english: { 'global.about': 'About' } }, languageKeys: { global: { about: {} } } };
    };
    window.currentProject = Object.assign({ schema: 1, name: '', kind: '', entry: '', rootPath: '', descriptorPath: '' }, defaultTranslations());
    window.toolbar = window.toolbar || {};

    function normalizeProject(raw, descriptorPath) {
        const value = raw && typeof raw === 'object' ? raw : {};
        const slash = descriptorPath.lastIndexOf('/');
        const colon = descriptorPath.indexOf(':');
        const rootPath = slash > colon ? descriptorPath.slice(0, slash + 1) : descriptorPath.slice(0, colon + 1);
        const translations = defaultTranslations();
        return {
            schema: 1,
            name: String(value.name || 'Unnamed project'),
            kind: ['kinui-klade', 'kinui-json', 'kindos-js'].includes(value.kind) ? value.kind : '',
            entry: String(value.entry || 'main.js'),
            languages: value.languages && typeof value.languages === 'object' ? value.languages : translations.languages,
            languageKeys: value.languageKeys && typeof value.languageKeys === 'object' ? value.languageKeys : translations.languageKeys,
            currentLanguage: value.currentLanguage || '', currentNamespace: value.currentNamespace || '',
            rootPath: rootPath, descriptorPath: descriptorPath
        };
    }

    function serializableProject() {
        const p = window.currentProject;
        return { schema: 1, name: p.name, kind: p.kind, entry: p.entry, languages: p.languages, languageKeys: p.languageKeys };
    }

    function renderProject() {
        const p = window.currentProject;
        document.getElementById('p-name').value = p.name || '';
        document.getElementById('p-kind').textContent = p.kind || 'No project';
        document.getElementById('p-root').textContent = p.rootPath || '—';
        document.getElementById('p-entry').textContent = p.entry || '—';
        window.updateBottomBar && window.updateBottomBar();
    }

    window.setCurrentProject = async function(project, descriptorPath) {
        window.currentProject = normalizeProject(project, descriptorPath);
        renderProject();
        if (window.currentProject.rootPath) await window.refreshFolderStructure(window.currentProject.rootPath);
    };

    window.openProjectDialog = async function() {
        try {
            const path = await window.requestKinFileDialog({ mode: 'load', initialPath: 'Home:Projects', preferredExtensions: ['acaret'] });
            const raw = JSON.parse(await window.kinReadFile(path));
            await window.setCurrentProject(raw, path);
            if (window.currentProject.entry) await window.loadFileFromPath(window.currentProject.rootPath + window.currentProject.entry);
        } catch (error) {
            if (error.message !== 'cancel') await window.kinAlert(error.message, { title: 'Open project' });
        }
    };

    window.saveProject = async function(saveAs) {
        try {
            let path = window.currentProject.descriptorPath;
            if (!path || saveAs) {
                path = await window.requestKinFileDialog({ mode: 'save', initialPath: window.currentProject.rootPath || 'Home:Projects', defaultFilename: 'project.acaret', preferredExtensions: ['acaret'] });
                if (!/\.acaret$/i.test(path)) path += '.acaret';
            }
            await window.kinWriteFile(path, JSON.stringify(serializableProject(), null, 2));
            window.currentProject.descriptorPath = path;
            await window.setCurrentProject(serializableProject(), path);
            return true;
        } catch (error) {
            if (error.message !== 'cancel') await window.kinAlert(error.message, { title: 'Save project' });
            return false;
        }
    };

    window.openTemplateWizard = function() {
        if (!window.kin || !kin.classes || !kin.classes.Window) {
            void window.kinAlert('The Kin window API is unavailable.', { title: 'New project' }); return;
        }
        new kin.classes.Window({
            entry: 'template-wizard.js', packageId: 'kin_acaret', title: 'New Acaret Project',
            width: 900, height: 650, module: true, quitOnClose: false,
            assets: [ { type: 'css', href: '../kin_ui/theme/kin-ui.css' }, { type: 'css', href: 'styles/template-wizard.css' } ]
        });
    };

    window.applyCreatedProject = async function(payload) {
        if (!payload || !payload.descriptorPath) return;
        await window.setCurrentProject(payload.project, payload.descriptorPath);
        if (payload.entryPath) await window.loadFileFromPath(payload.entryPath);
        document.getElementById('tab_editor').click();
    };

    window.toolbar.project = function() {
        const toolbar = document.getElementById('top_toolbar'); toolbar.replaceChildren();
        const label = document.createElement('strong'); label.textContent = 'Project'; toolbar.appendChild(label);
        renderProject();
    };

    document.addEventListener('change', function(event) {
        if (event.target.id === 'p-name') { window.currentProject.name = event.target.value.trim(); renderProject(); }
    });
    document.addEventListener('click', function(event) {
        if (event.target.id === 'project_new') window.openTemplateWizard();
        else if (event.target.id === 'project_open') void window.openProjectDialog();
        else if (event.target.id === 'project_save') void window.saveProject(false);
    });
})();
