// Navigator

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.navigator = function() {
    let tct = document.getElementById( 'top_chat_title' );
    let tcd = tct.getElementsByTagName( 'div' )[0];
    let tci = tct.getElementsByTagName( 'div' )[1];
    tcd.innerHTML = 'Navigator: ' + currentEditor.filename;
    tcd.className = 'navigator';
    tci.innerHTML = ''; //<em class="chat-reset" title="Reset chat"></em><em class="chat-save" title="Save chat"></em><em class="chat-more" title="Options"></em>';
    
    refreshNavigation();
}

function refreshNavigation() {
    // Ensure there's an active editor instance; if not, exit the function
    if (!currentEditor) return;

    // Get the content of the current editor
    let str = currentEditor.getValue();

    console.log('Nav test'); // Debug message
    let output = []; // Array to store navigation items (function names)

    // Extract the file extension from the editor's file name
    let ext = currentEditor.filename.split('.').pop();
    if (!ext) ext = 'js'; // Default to JavaScript if no extension is found
    ext = ext.toLowerCase(); // Normalize the extension to lowercase

    // Match JavaScript or Vue.js functions
    if (ext == 'js' || ext == 'vue') {
        let matches = str.match(/^\s*function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/gm); // Match standalone function declarations
        if (matches) {
            output = matches.map(match => {
                let cleanName = match.replace(/^\s*function\s+/, '').split('(')[0].trim(); // Extract the function name
                return { display: cleanName, searchString: match.trim() }; // Store both the display name and full match
            });
        }
    }

    // Match C/C++ functions
    if (ext == 'c' || ext == 'cpp') {
        let matches = str.match(/^\s*(?:\b[a-zA-Z_][a-zA-Z0-9_]*\s+)+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*?\)\s*{/gm); // Match function declarations
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
        t.innerHTML = output[a].display; // Display the function name
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

