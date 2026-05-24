(function() {
    function qp(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (_e) { return ''; }
    }

    async function init() {
        var pkg = qp('kin_repo_package') || 'kin_acaret';
        var base = '/repository/' + encodeURIComponent(pkg) + '/';

        // Set <base> so relative URLs in injected HTML resolve against the repo root
        var baseEl = document.createElement('base');
        baseEl.href = base;
        document.head.insertBefore(baseEl, document.head.firstChild);

        // Fetch index.html from the repo
        var resp = await fetch(base + 'index.html');
        var html = await resp.text();

        // Strip all <script> tags — they won't execute via innerHTML
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Extract head content: only add <link> and <title> elements (not innerHTML+= to avoid re-parsing workspace head)
        var headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
        if (headMatch) {
            var headTemp = document.createElement('div');
            headTemp.innerHTML = headMatch[1];
            for (var hi = 0; hi < headTemp.children.length; hi++) {
                var tag = headTemp.children[hi].tagName;
                if (tag === 'LINK' || tag === 'TITLE' || tag === 'META') {
                    document.head.appendChild(headTemp.children[hi].cloneNode(true));
                }
            }
        }

        // Extract <body> content and set as body.innerHTML
        var bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            document.body.innerHTML = bodyMatch[1];
        } else {
            document.body.innerHTML = html;
        }

        // Load JS files sequentially (order matters — ace first, then the rest)
        var jsFiles = [
            'libs/ace/src-noconflict/ace.js',
            'js/showdown.min.js',
            'js/signals.js',
            'js/conversation_logic.js',
            'js/conversation.js',
            'js/gui-logic.js',
            'js/page-editor.js',
            'js/page-shop.js',
            'js/page-flow-nodes.js',
            'js/page-ai-tools.js',
            'js/page-version-control.js',
            'js/page-project.js',
            'js/page-chat.js',
            'js/page-folders.js',
            'js/page-translations.js',
            'js/page-tags.js',
            'js/page-navigator.js'
        ];

        for (var i = 0; i < jsFiles.length; i++) {
            await loadScript(base + jsFiles[i]);
        }

        // Initialize the app (DOMContentLoaded has already fired in the iframe)
        window.convos = new Conversation({ messageContainer: document.querySelector('.messages') });
        initializeGUI();

        // Handle optional open-path from query
        var openPath = qp('kin_open_path') || qp('path');
        if (openPath && typeof loadFileFromPath === 'function') {
            loadFileFromPath(openPath);
        }
    }

    function loadScript(src) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.charset = 'utf-8';
            s.onload = resolve;
            s.onerror = function() {
                console.error('Failed to load:', src);
                resolve();
            };
            document.head.appendChild(s);
        });
    }

    init().catch(function(e) {
        console.error('kin_acaret init error:', e);
    });
})();
