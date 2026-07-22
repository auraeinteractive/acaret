// Kin workspace bridge and authenticated filesystem/shell APIs.
(function() {
    'use strict';

    const ORIGIN = window.location.origin;
    const INSTANCE_ID = queryParam('kin_app_instance');
    window.INSTANCE_ID = INSTANCE_ID;

    function queryParam(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (_e) { return ''; }
    }

    function postToParent(message) {
        if (window.parent !== window) window.parent.postMessage(message, ORIGIN);
    }

    function workspaceRequest(kind, payload) {
        const requestId = kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        const resultFlag = {
            file: 'kinFileDialogResult', alert: 'kinAlertResult',
            confirm: 'kinConfirmResult', prompt: 'kinPromptResult'
        }[kind];
        return new Promise(function(resolve, reject) {
            function onMessage(event) {
                if (event.origin !== ORIGIN || !event.data || event.data[resultFlag] !== true || event.data.requestId !== requestId) return;
                window.removeEventListener('message', onMessage);
                if (event.data.cancelled) reject(new Error('cancel'));
                else resolve(event.data);
            }
            window.addEventListener('message', onMessage);
            postToParent(Object.assign({ requestId: requestId }, payload));
        });
    }

    window.requestKinFileDialog = async function(options) {
        const o = options || {};
        const result = await workspaceRequest('file', {
            kinOpenFileDialog: true,
            mode: o.mode === 'save' ? 'save' : 'load',
            initialPath: o.initialPath || 'Home:',
            defaultFilename: o.defaultFilename || '',
            preferredExtension: o.preferredExtension,
            preferredExtensions: o.preferredExtensions
        });
        return result.path || (result.paths && result.paths[0]) || '';
    };

    window.kinAlert = function(message, options) {
        return workspaceRequest('alert', {
            kinOpenAlert: true, message: String(message || ''), title: options && options.title
        }).then(function() {});
    };

    window.kinConfirm = function(message, options) {
        return workspaceRequest('confirm', {
            kinOpenConfirm: true, message: String(message || ''), title: options && options.title,
            confirmLabel: options && options.confirmLabel
        }).then(function(result) { return !!result.ok; }).catch(function(error) {
            if (error.message === 'cancel') return false;
            throw error;
        });
    };

    window.kinPrompt = function(message, options) {
        return workspaceRequest('prompt', {
            kinOpenPrompt: true, message: String(message || ''), title: options && options.title,
            defaultValue: options && options.defaultValue
        }).then(function(result) { return result.value == null ? null : String(result.value); }).catch(function(error) {
            if (error.message === 'cancel') return null;
            throw error;
        });
    };

    async function jsonResponse(response, fallback) {
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok || (result.response !== 'success' && result.response !== 'ok')) {
            throw new Error(result.message || fallback || ('HTTP ' + response.status));
        }
        return result;
    }

    window.kinReadFile = async function(path) {
        const response = await fetch('/api/file/read', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ path: String(path) })
        });
        const result = await jsonResponse(response, 'Read failed');
        if (result.encoding === 'base64') {
            const binary = atob(String(result.data || ''));
            const bytes = Uint8Array.from(binary, function(ch) { return ch.charCodeAt(0); });
            return new TextDecoder('utf-8').decode(bytes);
        }
        return typeof result.data === 'string' ? result.data : '';
    };

    window.kinWriteFile = async function(path, body) {
        const payload = JSON.stringify({ path: String(path), body: String(body) });
        const response = await fetch('/api/file/write', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: new Blob([payload], { type: 'application/json; charset=UTF-8' })
        });
        return jsonResponse(response, 'Write failed');
    };

    window.kinListDirectory = async function(path) {
        const response = await fetch('/api/dir', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams({ path: String(path) }).toString()
        });
        const result = await jsonResponse(response, 'Directory listing failed');
        return Array.isArray(result.data) ? result.data : [];
    };

    async function kinCommand(name, params) {
        const response = await fetch('/api/commands/' + encodeURIComponent(name), {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams(params || {}).toString()
        });
        return jsonResponse(response, name + ' failed');
    }
    window.kinMakedir = function(path) { return kinCommand('makedir', { path: String(path) }); };
    window.kinDeleteToTrash = function(path) { return kinCommand('delete', { path: String(path), mode: 'TRASH' }); };

    window.kinRunShellLine = async function(line, cwd) {
        const response = await fetch('/api/kindos/shell-line', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ line: String(line), cwd: String(cwd || 'Home:') })
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok || result.response !== 'ok') throw new Error(result.message || 'KinDOS execution failed');
        return result;
    };

    window.launchKinApp = function(packageId, params) {
        postToParent({ kinWorkspace: true, action: 'launchRepositoryApp', packageId: packageId, params: params || {} });
    };

    window.loadFileFromPath = async function(path, options) {
        try {
            const content = await window.kinReadFile(path);
            if (typeof window.loadTextFile === 'function') window.loadTextFile(content, path, options || {});
        } catch (error) {
            await window.kinAlert(error.message, { title: 'Open file' });
        }
    };

    async function saveCurrent(saveAs) {
        if (!window.currentEditor) return false;
        let path = window.currentEditor.kinPath || '';
        if (saveAs || !path) {
            path = await window.requestKinFileDialog({
                mode: 'save', initialPath: window.currentFolder || 'Home:',
                defaultFilename: window.currentEditor.filename === 'New file' ? 'untitled.txt' : window.currentEditor.filename
            });
        }
        await window.kinWriteFile(path, window.currentEditor.getValue());
        window.setEditorPath(window.currentEditor, path);
        window.currentEditor.document_saved = true;
        window.updateEditorTabLabel(window.currentEditor);
        window.updateBottomBar();
        return true;
    }
    window.saveCurrentFile = async function(saveAs) {
        try { return await saveCurrent(!!saveAs); }
        catch (error) {
            if (error.message !== 'cancel') await window.kinAlert(error.message, { title: 'Save file' });
            return false;
        }
    };

    function registerKinMenus() {
        if (!INSTANCE_ID) return;
        postToParent({
            kinAppRegisterMenus: true, instanceId: INSTANCE_ID,
            menus: {
                File: [
                    { name: 'New File', command: 'file.new' },
                    { name: 'New from Template…', command: 'project.new' },
                    { name: 'Open File…', command: 'file.open' },
                    { type: 'separator' },
                    { name: 'Save', command: 'file.save' },
                    { name: 'Save As…', command: 'file.saveAs' },
                    { type: 'separator' },
                    { name: 'Open Project…', command: 'project.open' },
                    { name: 'Save Project', command: 'project.save' },
                    { type: 'separator' },
                    { name: 'Close File', command: 'file.close' },
                    { name: 'Close All Files', command: 'file.closeAll' }
                ],
                Edit: [
                    { name: 'Undo', command: 'edit.undo' }, { name: 'Redo', command: 'edit.redo' },
                    { type: 'separator' },
                    { name: 'Cut', command: 'edit.cut' }, { name: 'Copy', command: 'edit.copy' },
                    { name: 'Paste', command: 'edit.paste' }, { name: 'Find…', command: 'edit.find' }
                ],
                Run: [ { name: 'Run in KinDOS', command: 'run.kindos' } ],
                Help: [ { name: 'About Acaret', command: 'help.about' } ]
            }
        });
    }

    async function handleMenuCommand(command) {
        try {
            if (command === 'file.new') window.newEditor();
            else if (command === 'file.open') {
                const path = await window.requestKinFileDialog({ mode: 'load', initialPath: window.currentFolder || 'Home:' });
                if (/\.klade$/i.test(path)) window.openInKlade(path); else await window.loadFileFromPath(path);
            } else if (command === 'file.save') await window.saveCurrentFile(false);
            else if (command === 'file.saveAs') await window.saveCurrentFile(true);
            else if (command === 'file.close') await window.closeFile(window.currentEditor);
            else if (command === 'file.closeAll') await window.closeFileAll();
            else if (command === 'project.new') window.openTemplateWizard();
            else if (command === 'project.open') await window.openProjectDialog();
            else if (command === 'project.save') await window.saveProject();
            else if (command === 'run.kindos') await window.runCurrentInKinDOS();
            else if (/^edit\./.test(command) && window.currentEditor) {
                const action = command.slice(5);
                if (action === 'find') window.currentEditor.execCommand('find');
                else if (action === 'undo' || action === 'redo') window.currentEditor.execCommand(action);
                else await window.editorClipboardAction(action);
            } else if (command === 'help.about') {
                await window.kinAlert('Acaret 1.1.0\n\nKin code editor and development workspace.', { title: 'About Acaret' });
            }
        } catch (error) {
            if (error.message !== 'cancel') await window.kinAlert(error.message, { title: 'Acaret' });
        }
    }
    window.handleMenuCommand = handleMenuCommand;

    window.addEventListener('message', function(event) {
        if (event.origin !== ORIGIN || !event.data) return;
        if (event.data.kinMenuCommand === true && event.data.command) handleMenuCommand(event.data.command);
    });

    window.registerKinMenus = registerKinMenus;
})();
