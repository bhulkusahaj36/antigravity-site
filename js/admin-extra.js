/**
 * admin-extra.js - Additional Admin Tools
 */

function initSyncTool() {
    console.log("Initializing Sync Tool...");
    const btnExport = document.getElementById('btnExportTags');
    const container = document.getElementById('exportContainer');
    const textArea = document.getElementById('txtExportArea');

    if (!btnExport || !container || !textArea) {
        console.warn("Sync tool elements not found in DOM.");
        return;
    }

    btnExport.onclick = () => {
        const stored = localStorage.getItem('hk_custom_tags');
        if (!stored) {
            alert("No local category mappings found on this browser.");
            return;
        }

        try {
            const tags = JSON.parse(stored);
            const mappings = {};
            
            // Process topic, source, prasang into a flat ID -> Label map
            const categories = [...(tags.topic || []), ...(tags.source || []), ...(tags.prasang || [])];
            
            categories.forEach(item => {
                if (item.value && item.label) {
                    mappings[item.value] = item.label;
                }
            });

            if (Object.keys(mappings).length === 0) {
                alert("Local storage found but no valid mappings (value/label pairs) were found.");
                return;
            }

            // Generate code snippet
            let code = "// Add this to TOPIC_LABELS in js/data.js\n\n";
            for (const [id, label] of Object.entries(mappings)) {
                code += `    '${id}': '${label}',\n`;
            }

            textArea.value = code;
            container.style.display = 'block';
            textArea.select();
            
            alert("Mappings exported! Please copy the code from the box and provide it to the assistant.");

        } catch (err) {
            console.error("Error parsing tags:", err);
            alert("Failed to parse local tags.");
        }
    };
}

// Hook into the tab system if possible, or just initialize if the panel is shown
document.addEventListener('DOMContentLoaded', () => {
    // We listen for any click on the Maintenance tab
    const syncTab = document.querySelector('[data-target="panel-sync"]');
    if (syncTab) {
        syncTab.addEventListener('click', initSyncTool);
    }
});
