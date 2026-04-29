const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '../views/index.html');
const tempScriptPath = path.join(__dirname, '../temp_script.js');

try {
    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    const tempScript = fs.readFileSync(tempScriptPath, 'utf8');

    const scriptStartToken = '<script>';
    const scriptEndToken = '</script>';

    // Find the last <script> tag which corresponds to our logic
    const startIndex = indexHtml.lastIndexOf(scriptStartToken);
    const endIndex = indexHtml.lastIndexOf(scriptEndToken);

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const beforeScript = indexHtml.substring(0, startIndex + scriptStartToken.length);
        const afterScript = indexHtml.substring(endIndex);
        
        // Add newlines around the tempScript content
        const updatedHtml = beforeScript + '\n' + tempScript + '\n    ' + afterScript;
        
        fs.writeFileSync(indexHtmlPath, updatedHtml, 'utf8');
        console.log('Successfully updated views/index.html');
    } else {
        console.log('Error: Could not find the script tags correctly.');
    }
} catch (error) {
    console.error('Failed:', error);
}
