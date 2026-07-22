(function() {
    'use strict';
    window.toolbar = window.toolbar || {};
    let view = 'languages';

    function project() {
        const value = window.currentProject || {};
        value.languages = value.languages && typeof value.languages === 'object' ? value.languages : {};
        value.languageKeys = value.languageKeys && typeof value.languageKeys === 'object' ? value.languageKeys : {};
        return value;
    }

    function headerButton(label, title, handler) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'text-action'; button.textContent = label; button.title = title;
        button.addEventListener('click', handler); return button;
    }

    function buildHeader() {
        const p = project();
        const header = document.getElementById('right_panel_header');
        const title = header.children[0], actions = header.children[1];
        title.className = 'translations'; title.textContent = 'Translations: ' + (p.name || 'Unnamed project');
        actions.replaceChildren(
            headerButton('Languages', 'Manage languages', function() { view = 'languages'; render(); }),
            headerButton('Strings', 'Manage translation strings', function() { view = 'strings'; render(); })
        );
    }

    function empty(message) {
        const node = document.createElement('p'); node.className = 'translation-empty'; node.textContent = message; return node;
    }

    function renderLanguages(host) {
        const p = project();
        const list = document.createElement('div'); list.className = 'translation-list';
        const names = Object.keys(p.languages).sort();
        names.forEach(function(name) {
            const row = document.createElement('button'); row.type = 'button'; row.className = 'translation-row';
            row.classList.toggle('active', p.currentLanguage === name);
            const count = Object.keys(p.languages[name] || {}).length;
            row.textContent = name + ' · ' + count + ' string' + (count === 1 ? '' : 's');
            row.addEventListener('click', function() { p.currentLanguage = name; render(); });
            list.appendChild(row);
        });
        if (!names.length) list.appendChild(empty('No languages yet.'));
        const add = headerButton('Add language…', 'Add language', async function() {
            const name = await window.kinPrompt('Language name', { title: 'Add language', defaultValue: 'english' });
            const key = String(name || '').trim();
            if (!key) return;
            if (Object.prototype.hasOwnProperty.call(p.languages, key)) {
                await window.kinAlert('That language already exists.', { title: 'Translations' }); return;
            }
            p.languages[key] = {}; p.currentLanguage = key; render();
        });
        add.className = 'translation-add'; host.append(list, add);
    }

    function stringKeys(p, namespace) {
        return Object.keys(p.languageKeys[namespace] || {}).sort();
    }

    function renderStrings(host) {
        const p = project();
        const languages = Object.keys(p.languages).sort();
        const namespaces = Object.keys(p.languageKeys).sort();
        if (!languages.length) { host.appendChild(empty('Add a language before editing strings.')); return; }
        if (!p.currentLanguage || !p.languages[p.currentLanguage]) p.currentLanguage = languages[0];
        if (!p.currentNamespace || !p.languageKeys[p.currentNamespace]) p.currentNamespace = namespaces[0] || '';

        const controls = document.createElement('div'); controls.className = 'translation-controls';
        const language = document.createElement('select'); language.title = 'Language';
        languages.forEach(function(name) { const option = new Option(name, name); option.selected = name === p.currentLanguage; language.add(option); });
        language.addEventListener('change', function() { p.currentLanguage = language.value; render(); });
        const namespace = document.createElement('select'); namespace.title = 'Namespace';
        namespaces.forEach(function(name) { const option = new Option(name, name); option.selected = name === p.currentNamespace; namespace.add(option); });
        namespace.addEventListener('change', function() { p.currentNamespace = namespace.value; render(); });
        const addNamespace = headerButton('New namespace…', 'Add namespace', async function() {
            const answer = await window.kinPrompt('Namespace', { title: 'New namespace', defaultValue: 'global' });
            const name = String(answer || '').trim().replace(/\s+/g, '_');
            if (!name) return;
            p.languageKeys[name] = p.languageKeys[name] || {}; p.currentNamespace = name; render();
        });
        controls.append(language, namespace, addNamespace); host.appendChild(controls);

        const table = document.createElement('table'); table.className = 'translation-table';
        const head = document.createElement('tr');
        ['Key', 'Translation'].forEach(function(label) { const th = document.createElement('th'); th.textContent = label; head.appendChild(th); });
        const thead = document.createElement('thead'); thead.appendChild(head); table.appendChild(thead);
        const body = document.createElement('tbody');
        stringKeys(p, p.currentNamespace).forEach(function(key) {
            const row = document.createElement('tr'); const name = document.createElement('td'); name.textContent = key;
            const cell = document.createElement('td'); const input = document.createElement('input'); input.type = 'text';
            const qualified = p.currentNamespace + '.' + key; input.value = p.languages[p.currentLanguage][qualified] || '';
            input.addEventListener('change', function() { p.languages[p.currentLanguage][qualified] = input.value; });
            cell.appendChild(input); row.append(name, cell); body.appendChild(row);
        });
        table.appendChild(body); host.appendChild(table);
        if (!p.currentNamespace) host.appendChild(empty('Create a namespace to add strings.'));
        const addKey = headerButton('Add string…', 'Add translation string', async function() {
            if (!p.currentNamespace) return;
            const answer = await window.kinPrompt('String key', { title: 'Add string', defaultValue: 'welcome' });
            const key = String(answer || '').trim().replace(/\s+/g, '_');
            if (!key) return;
            p.languageKeys[p.currentNamespace][key] = p.languageKeys[p.currentNamespace][key] || {};
            render();
        });
        addKey.className = 'translation-add'; addKey.disabled = !p.currentNamespace; host.appendChild(addKey);
    }

    function render() {
        buildHeader();
        const host = document.getElementById('page_translations'); host.replaceChildren();
        if (view === 'strings') renderStrings(host); else renderLanguages(host);
    }

    window.toolbar.translations = render;
})();
