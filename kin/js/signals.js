// Kin-compatible signal system
// Replaces WebKit messageHandlers with Kin HTTP APIs and postMessage

window.callbackIds = 0;
window.callbacks = {};
window.INSTANCE_ID = '';
window.currentKinVolume = 'Home:'; // Track current Kin volume

// Convert acaret path to Kin path
function acaretToKinPath(path, filename) {
    // If already a Kin path, return as-is
    if (path && path.indexOf(':') > 0) return path + (filename || '');
    // Remove leading slash if present
    if (path && path.startsWith('/')) path = path.substring(1);
    // Remove trailing slash from path
    if (path && path.endsWith('/')) path = path.substring(0, path.length - 1);
    // Prepend current volume
    let vol = window.currentKinVolume || 'Home:';
    // Remove trailing slash from volume
    if (vol.endsWith(':')) vol = vol;
    else vol = vol + ':';
    let result = vol + (path || '') + (filename ? '/' + filename : '');
    console.log('[signal] acaretToKinPath:', path, filename, '->', result);
    return result;
}

// Convert Kin path to acaret path
function kinToAcaretPath(kinPath) {
    // Parse "Volume:path/to/file" format
    if (kinPath.indexOf(':') > 0) {
        let parts = kinPath.split(':');
        window.currentKinVolume = parts[0] + ':';
        return parts[1] || '';
    }
    return kinPath;
}

// Get INSTANCE_ID from URL
function getInstanceId() {
    try {
        const u = new URL(window.location.href);
        return u.searchParams.get('kin_app_instance') || '';
    } catch (_e) {
        return '';
    }
}

window.INSTANCE_ID = getInstanceId();

// Post message to parent (Kin workspace)
function postToParent(msg) {
    try {
        window.parent.postMessage(msg, window.location.origin);
    } catch (_e) { /* ignore */ }
}

// Request file dialog from Kin
function requestKinFileDialog(opts) {
    const o = opts || {};
    return new Promise((resolve, reject) => {
        const requestId = 'fd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        function onMsg(e) {
            if (e.origin !== window.location.origin) return;
            if (!e.data || e.data.kinFileDialogResult !== true) return;
            if (e.data.requestId !== requestId) return;
            window.removeEventListener('message', onMsg);
            if (e.data.cancelled) reject(new Error('cancel'));
            else resolve(e.data.path);
        }
        window.addEventListener('message', onMsg);
        postToParent({
            kinOpenFileDialog: true,
            requestId: requestId,
            mode: o.mode === 'save' ? 'save' : 'load',
            initialPath: o.initialPath || 'Home:',
            defaultFilename: o.defaultFilename != null ? String(o.defaultFilename) : ''
        });
    });
}

// Register menus with Kin workspace
function registerKinMenus() {
    if (!window.INSTANCE_ID) return;
    
    postToParent({
        kinAppRegisterMenus: true,
        instanceId: window.INSTANCE_ID,
        menus: {
            File: [
                { name: 'New Project', command: 'acaret.new_project' },
                { name: 'Open Project…', command: 'acaret.open_project' },
                { name: 'Save Project', command: 'acaret.save_project' },
                { name: 'Save Project As…', command: 'acaret.save_project_as' },
                { type: 'separator' },
                { name: 'New File', command: 'acaret.new_file' },
                { name: 'Open File…', command: 'acaret.open_file' },
                { name: 'Save File', command: 'acaret.save_file' },
                { name: 'Save File As…', command: 'acaret.save_file_as' },
                { type: 'separator' },
                { name: 'Close File', command: 'acaret.close_file' },
                { name: 'Close All Files', command: 'acaret.close_all_files' }
            ],
            Edit: [
                { name: 'Cut', command: 'edit.cut' },
                { name: 'Copy', command: 'edit.copy' },
                { name: 'Paste', command: 'edit.paste' },
                { type: 'separator' },
                { name: 'Record Macro', command: 'edit.record_macro' },
                { name: 'Store Macro', command: 'edit.store_macro' },
                { name: 'Run Macro', command: 'edit.run_macro' }
            ],
            Settings: [
                { name: 'Edit Settings', command: 'settings.edit' },
                { name: 'Load Settings', command: 'settings.load' },
                { name: 'Save Settings', command: 'settings.save' },
                { type: 'separator' },
                { name: 'About', command: 'settings.about' }
            ]
        }
    });
}

// Handle menu commands
async function handleMenuCommand(cmd) {
    console.log('[signal] Handling menu command:', cmd);
    
    try {
        if (cmd === 'acaret.new_file') {
            if (typeof newEditor === 'function') {
                newEditor();
            }
        } else if (cmd === 'acaret.open_file') {
            const path = await requestKinFileDialog({ mode: 'load', initialPath: 'Home:' });
            if (path && typeof loadFileFromPath === 'function') {
                loadFileFromPath(path);
            }
        } else if (cmd === 'acaret.save_file' || cmd === 'acaret.save_file_as') {
            if (typeof currentEditor !== 'undefined' && currentEditor) {
                let savePath;
                
                // For regular save (not save-as), use existing path if it exists
                if (cmd === 'acaret.save_file' && currentEditor.path && currentEditor.filename && 
                    currentEditor.path !== '/' && currentEditor.filename !== 'untitled.txt') {
                    savePath = acaretToKinPath(currentEditor.path, currentEditor.filename);
                }
                
                // If no valid path, or Save As, open dialog
                if (!savePath || savePath === 'Home:' || savePath === 'Home:/' || cmd === 'acaret.save_file_as') {
                    savePath = await requestKinFileDialog({ 
                        mode: 'save', 
                        initialPath: window.currentKinVolume || 'Home:',
                        defaultFilename: currentEditor.filename || 'untitled.txt'
                    });
                }
                
                if (savePath) {
                    // Update currentKinVolume based on the selected path
                    if (savePath.indexOf(':') > 0) {
                        let parts = savePath.split(':');
                        window.currentKinVolume = parts[0] + ':';
                        // Update editor to acaret path format
                        let kinPath = parts[1] || '';
                        let lastSlash = kinPath.lastIndexOf('/');
                        if (lastSlash > 0) {
                            currentEditor.path = kinPath.substring(0, lastSlash + 1);
                            currentEditor.filename = kinPath.substring(lastSlash + 1);
                        } else {
                            currentEditor.path = '';
                            currentEditor.filename = kinPath;
                        }
                    }
                    await saveFileToPath(savePath, currentEditor.getValue());
                }
            }
        } else if (cmd === 'acaret.open_project') {
            const path = await requestKinFileDialog({ mode: 'load', initialPath: 'Home:Projects' });
            if (path && typeof sendSignal === 'function') {
                sendSignal('open_project', { path: path }, function(response) {
                    console.log('Project opened:', response);
                });
            }
        } else if (cmd === 'acaret.save_project') {
            if (typeof currentProject !== 'undefined' && currentProject.name) {
                await saveProjectToPath('Home:Projects/' + currentProject.name + '.acaret');
            }
        } else if (cmd === 'acaret.close_file') {
            if (typeof closeFile === 'function') {
                closeFile(currentEditor);
            }
        } else if (cmd === 'acaret.close_all_files') {
            if (typeof closeFileAll === 'function') {
                closeFileAll();
            }
        } else if (cmd === 'settings.about') {
            alert('Acaret v1.0.0\n\nAn AI Development Environment');
        } else {
            console.log('[signal] Unhandled command:', cmd);
        }
    } catch (e) {
        if (e.message !== 'cancel') {
            console.error('[signal] Command error:', e);
        }
    }
}

// Save file using Kin API
async function saveFileToPath(path, content) {
    try {
        const response = await fetch('/api/file/write', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ path: path, body: content })
        });
        const result = await response.json();
        if (result.response === 'success') {
            console.log('File saved:', path);
            if (typeof currentEditor !== 'undefined' && currentEditor) {
                currentEditor.document_saved = true;
                if (typeof updateBottomBar === 'function') updateBottomBar();
            }
        } else {
            console.error('Save failed:', result.message);
        }
    } catch (e) {
        console.error('Save error:', e);
    }
}

// Save project using Kin API
async function saveProjectToPath(path) {
    try {
        const projectData = JSON.stringify(currentProject, null, 2);
        const response = await fetch('/api/file/write', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ path: path, body: projectData })
        });
        const result = await response.json();
        if (result.response === 'success') {
            console.log('Project saved:', path);
        }
    } catch (e) {
        console.error('Project save error:', e);
    }
}

// Load file from Kin path (global)
window.loadFileFromPath = function(path) {
    console.log('[signal] Loading file from:', path);
    
    fetch('/api/file/read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ path: path })
    }).then(function(r) { return r.json(); })
      .then(function(result) {
          console.log('[signal] Read result:', result);
          
          if (result.response === 'success' && result.data !== undefined) {
              // Get content - may be base64 or plain text
              let content = result.data;
              
              // If encoding is base64, decode it
              if (result.encoding === 'base64' || typeof content === 'string') {
                  try {
                      // Try to decode if it looks like base64
                      if (result.encoding === 'base64') {
                          content = atob(content);
                          // Convert to Uint8Array then to string
                          const bytes = new Uint8Array(content.length);
                          for (let i = 0; i < content.length; i++) {
                              bytes[i] = content.charCodeAt(i);
                          }
                          content = new TextDecoder('utf-8').decode(bytes);
                      }
                  } catch (e) {
                      console.error('[signal] Decode error:', e);
                  }
              }
              
              // Extract filename and path from Kin path
              // Kin path format: "Volume:path/to/file" or "Home:Documents/test.c"
              let kinPathPart = path;
              let volume = 'Home:';
              if (kinPathPart.indexOf(':') > 0) {
                  let parts = kinPathPart.split(':');
                  volume = parts[0] + ':';
                  kinPathPart = parts[1] || '';
              }
              window.currentKinVolume = volume;
              let filename = kinPathPart.split('/').pop() || kinPathPart;
              let acaretPath = kinPathPart.substring(0, kinPathPart.lastIndexOf('/') + 1);
              
              console.log('[signal] Loading:', filename, 'from path:', acaretPath, 'volume:', window.currentKinVolume);
              
              // Use acaret's loadFile function
              if (typeof loadFile === 'function') {
                  // Encode content as base64 for acaret
                  const encoder = new TextEncoder();
                  const bytes = encoder.encode(content);
                  let binary = '';
                  for (let i = 0; i < bytes.length; i++) {
                      binary += String.fromCharCode(bytes[i]);
                  }
                  const base64 = btoa(binary);
                  loadFile(base64, acaretPath, filename);
              } else {
                  console.log('[signal] File loaded (loadFile not available):', filename);
              }
          } else {
              console.error('[signal] Load failed:', result.message);
          }
      }).catch(function(err) {
          console.error('Load error:', err);
      });
}

// Send signal using Kin HTTP API
window.sendSignal = function(command, data, callback) {
    var callbackId = window.callbackIds++;
    
    if (data) {
        if (typeof(data) == 'object')
            data = JSON.stringify(data);
        command = command + "\n" + base64EncodeUtf8(data);
    }
    
    window.callbacks[callbackId] = function(response) {
        if (callback) callback(response || base64DecodeUtf8(response));
    };
    
    // Parse command
    var parts = command.split('\n')[0];
    
    // Map commands to Kin APIs
    if (parts === 'startup') {
        if (window.callbacks[callbackId]) {
            window.callbacks[callbackId]('success');
            delete window.callbacks[callbackId];
        }
        registerKinMenus();
        return;
    }
    
    if (parts === 'open_file' || parts === 'open_project') {
        // Trigger file dialog
        handleMenuCommand('acaret.' + parts);
        // Return success for now - actual response is async
        if (window.callbacks[callbackId]) {
            window.callbacks[callbackId]('success');
            delete window.callbacks[callbackId];
        }
        return;
    }
    
    if (parts === 'save_file' || parts === 'save_project') {
        handleMenuCommand('acaret.' + parts);
        if (window.callbacks[callbackId]) {
            window.callbacks[callbackId]('success');
            delete window.callbacks[callbackId];
        }
        return;
    }
    
    if (parts === 'new_file') {
        handleMenuCommand('acaret.new_file');
        if (window.callbacks[callbackId]) {
            window.callbacks[callbackId]('success');
            delete window.callbacks[callbackId];
        }
        return;
    }
    
    if (parts === 'list_directory') {
        // Use Kin API for directory listing
        var path = 'Home:';
        if (data) {
            try {
                var parsed = JSON.parse(base64DecodeUtf8(data));
                path = parsed.path || path;
            } catch (e) { /* use default */ }
        }
        
        fetch('/api/dir', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'path=' + encodeURIComponent(path)
        }).then(function(r) { return r.json(); })
          .then(function(result) {
              if (result.response === 'success' && result.data) {
                  var responseData = JSON.stringify(result.data);
                  if (window.callbacks[callbackId]) {
                      window.callbacks[callbackId](base64EncodeUtf8(responseData));
                      delete window.callbacks[callbackId];
                  }
              } else {
                  if (window.callbacks[callbackId]) {
                      window.callbacks[callbackId]('fail');
                      delete window.callbacks[callbackId];
                  }
              }
          }).catch(function(err) {
              console.error('Dir error:', err);
              if (window.callbacks[callbackId]) {
                  window.callbacks[callbackId]('fail');
                  delete window.callbacks[callbackId];
              }
          });
        return;
    }
    
    // For unknown commands, fail gracefully
    console.warn('Unknown signal command:', parts);
    if (window.callbacks[callbackId]) {
        window.callbacks[callbackId]('fail');
        delete window.callbacks[callbackId];
    }
};

window.executeSignalCallback = function(callbackId, data) {
    if (data === undefined) data = '';
    if (window.callbacks[callbackId]) {
        data = base64DecodeUtf8(data);
        window.callbacks[callbackId](data);
        var o = {};
        for (var a in window.callbacks) {
            if (a != callbackId) {
                o[a] = window.callbacks[a];
            }
        }
        window.callbacks = o;
    }
};

// Listen for messages from Kin workspace
window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    
    var data = event.data;
    if (!data) return;
    
    // Handle Kin menu commands
    if (data.kinMenuCommand === true && data.command) {
        handleMenuCommand(data.command);
    }
    
    // Handle response from Kin command
    if (data.kinSignalResponse === true && data.callbackId !== undefined) {
        executeSignalCallback(data.callbackId, data.data || '');
    }
});
