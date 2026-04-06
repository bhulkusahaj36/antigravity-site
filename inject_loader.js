const fs = require('fs');
const glob = require('fs').readdirSync('.');
const htmlFiles = glob.filter(f => f.endsWith('.html'));

const loaderHtml = `
    <!-- GLOBAL PAGE LOADER -->
    <div id="global-loader" class="global-loader">
        <div class="loader">
            <div class="book-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 126 75" class="book">
                    <rect stroke-width="3" stroke="var(--gold-500)" rx="7.5" height="70" width="121" y="2.5" x="2.5"></rect>
                    <line stroke-width="3" stroke="var(--gold-500)" y2="75" x2="63.5" x1="63.5"></line>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M25 20H50"></path>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M101 20H76"></path>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M16 30L50 30"></path>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M110 30L76 30"></path>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="var(--gold-500)" viewBox="0 0 65 75" class="book-page">
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M40 20H15"></path>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M49 35H15"></path>
                    <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M49 50H15"></path>
                    <path stroke-width="3" stroke="var(--gold-500)" d="M2.5 2.5H55C59.1421 2.5 62.5 5.85786 62.5 10V65C62.5 69.1421 59.1421 72.5 55 72.5H2.5V2.5Z"></path>
                </svg>
            </div>
        </div>
    </div>
`;

htmlFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Ensure no double injection and clean up the previous loader div if it exists
    content = content.replace(/<!-- GLOBAL PAGE LOADER -->[\s\S]*?<div id="global-loader"[\s\S]*?<\/svg>\s*<\/div>\s*<\/div>\s*<\/div>/i, '');
    
    // Inject right after <body> or <body class="...">
    let newContent = content.replace(/(<body[^>]*>)/i, '$1\n' + loaderHtml);
    fs.writeFileSync(f, newContent, 'utf8');
});
console.log('Injection complete');