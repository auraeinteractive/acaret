(function() {
    function qp(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (_e) { return ''; }
    }

    async function init() {
        var pkg = qp('kin_repo_package') || 'kin_acaret';
        var base = '/repository/' + encodeURIComponent(pkg) + '/';

        if (!document.querySelector('base')) {
            var baseEl = document.createElement('base');
            baseEl.href = base;
            document.head.insertBefore(baseEl, document.head.firstChild);
        }

        var resp = await fetch(base + 'index.html');
        if (!resp.ok) {
            throw new Error('Failed to load index.html: ' + resp.status);
        }
        var html = await resp.text();

        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

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

        var bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            document.body.innerHTML = bodyMatch[1];
        } else {
            document.body.innerHTML = html;
        }

        var jsFiles = [
            'libs/ace/src-noconflict/ace.js',
            'libs/ace/src-noconflict/mode-javascript.js',
            'libs/ace/src-noconflict/theme-twilight.js',
            'js/showdown.min.js',
            'js/signals.js',
            'js/gui-logic.js',
            'js/page-editor.js',
            'js/page-project.js',
            'js/page-folders.js',
            'js/page-translations.js',
            'js/page-tags.js',
            'js/page-navigator.js'
        ];

        for (var i = 0; i < jsFiles.length; i++) {
            await loadScript(base + jsFiles[i]);
        }

        function startApp() {
            initializeGUI();

            if (typeof resizeAllEditors === 'function') {
                resizeAllEditors();
            }

            var openPath = qp('kin_open_path') || qp('path');
            if (openPath && typeof loadFileFromPath === 'function') {
                if (/\.klade$/i.test(openPath) && typeof openInKlade === 'function') openInKlade(openPath);
                else loadFileFromPath(openPath);
            }

            try {
                parent.postMessage({ kinRepositoryAppLoaded: true }, window.location.origin);
            } catch (_e) { /* ignore */ }
        }

        requestAnimationFrame(function() {
            requestAnimationFrame(startApp);
        });
    }

    function loadScript(src) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.charset = 'utf-8';
            s.onload = resolve;
            s.onerror = function() {
                console.error('Failed to load:', src);
                reject(new Error('Failed to load required script: ' + src));
            };
            document.head.appendChild(s);
        });
    }

    init().catch(function(e) {
        console.error('kin_acaret init error:', e);
        try {
            parent.postMessage({ kinRepositoryAppLoaded: true }, window.location.origin);
        } catch (_e) { /* ignore */ }
    });
})();
