// Navigator

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.navigator = function() {
    if( document.getElementById( 'page_navigator' ).classList.contains( 'active' ) )
    {
        let tct = document.getElementById( 'right_panel_header' );
        let tcd = tct.getElementsByTagName( 'div' )[0];
        let tci = tct.getElementsByTagName( 'div' )[1];
        tcd.textContent = 'Navigator: ' + ( currentEditor ? currentEditor.filename : 'No file' );
        tcd.className = 'navigator';
        tci.replaceChildren();
    }
    
    refreshNavigation();
}

function refreshNavigation() {
    // Ensure there's an active editor instance; if not, exit the function
    if (!currentEditor) return;

    // Get the content of the current editor
    let str = currentEditor.getValue();

    let output = []; // Array to store navigation items (function names)

    // Extract the file extension from the editor's file name
    let ext = currentEditor.filename.split('.').pop();
    if (!ext) ext = 'js'; // Default to JavaScript if no extension is found
    ext = ext.toLowerCase(); // Normalize the extension to lowercase

    if (ext === 'js' || ext === 'vue' || ext === 'sh') {
        // Match standalone function declarations, exported functions, async functions, and Vue.js shorthand methods
        let matches = str.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(|^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*\)\s*{/gm);

        if (matches) {
            output = matches.map(match => {
                // Extract the function name while cleaning prefixes like "export", "async", etc.
                let cleanName = match
                    .replace(/^\s*(?:export\s+)?(?:async\s+)?function\s+/, '') // Remove "export async function" or "function"
                    .replace(/\(\s*\).*$/, '') // Remove everything from the first "(" onward
                    .replace(/^\s*|\s*$/g, ''); // Trim whitespace
                return { display: cleanName, searchString: match.trim() }; // Store both display name and full match
            });
        }
    }


    // Match C/C++ functions
    if (ext == 'c' || ext == 'cpp') {
        let matches = str.match(/^\s*(?:\b(?!if|else|for|while|switch|return)[a-zA-Z_][a-zA-Z0-9_]*\s*\*?\s*)+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/gm);
        if (matches) {
            output = matches.map(match => {
                let cleanName = match.split('(')[0].trim().split(' ').pop(); // Extract the function name
                return { display: cleanName, searchString: match.trim() }; // Store both the display name and full match
            });
        }
    }

    // Match Python functions
    if (ext == 'py') {
        let matches = str.match(/^\s*def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*?\)\s*:/gm); // Match Python function definitions
        if (matches) {
            output = matches.map(match => {
                let cleanName = match.replace(/^\s*def\s+/, '').split('(')[0].trim(); // Extract the function name
                return { display: cleanName, searchString: match.trim() }; // Store both the display name and full match
            });
        }
    }

    // Match Java methods
    if (ext == 'java') {
        let matches = str.match(/^\s*(?:\b[a-zA-Z_][a-zA-Z0-9_]*\s+)+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*?\)\s*{/gm); // Match Java methods
        if (matches) {
            output = matches.map(match => {
                let cleanName = match.split('(')[0].trim().split(' ').pop(); // Extract the method name
                return { display: cleanName, searchString: match.trim() }; // Store both the display name and full match
            });
        }
    }
    
    // Match CSS selectors
    if (ext == 'css') {
        let matches = str.match(/^\s*[.#]?[a-zA-Z_][a-zA-Z0-9_-]*\s*\{/gm); // Match CSS selectors (class, ID, or element)
        if (matches) {
            output = matches.map(match => {
                let cleanName = match.split('{')[0].trim(); // Extract the selector name
                return { display: cleanName, searchString: match.trim() }; // Store both the display name and full match
            });
        }
    }

    // Clear the navigation container in the UI
    let cont = document.getElementById('page_navigator');
    cont.innerHTML = '';

    // Create a container for navigation items
    let navDiv = document.createElement('div');
    navDiv.className = 'navigation-items';
    cont.appendChild(navDiv);

    // Populate the navigation container with function names
    for (let a = 0; a < output.length; a++) {
        let t = document.createElement('div'); // Create a new div for each navigation item
        t.className = 'navigation-item';
        
        // Sanitize
        let sout = output[a].display;
        if( sout.substr( -1, 1 ) == '(' )
            sout = sout.substr( 0, sout.length - 1 );
            
        t.textContent = sout; // Display the function name
        navDiv.appendChild(t); // Add the item to the navigation container

        // Add an event listener for clicking on the navigation item
        t.onclick = () => {
            let session = currentEditor.getSession(); // Get the editor session
            if (!session) return;

            // Use the full function signature for precise searching
            let searchStrings = [output[a].searchString];
            for (let b = 0; b < searchStrings.length; b++) {
                let range = currentEditor.find(searchStrings[b], {
                    backwards: false, // Search forwards
                    caseSensitive: false, // Case-insensitive search
                    wholeWord: false // Allow partial matches
                });
                if (range) {
                    currentEditor.selection.setRange(range); // Highlight the matched function
                    return;
                }
            }
        };
    }
}



