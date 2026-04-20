const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\OneDrive\\Desktop\\chidy prime\\views\\admin.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/g);
const { execSync } = require('child_process');
if (scriptMatch) {
    scriptMatch.forEach((script, i) => {
        const code = script.replace('<script>', '').replace('</script>', '');
        fs.writeFileSync(`scratch/temp_script_${i}.js`, code);
        try {
            execSync(`node -c scratch/temp_script_${i}.js`, { encoding: 'utf8' });
            console.log(`Script ${i} is valid.`);
        } catch (e) {
            console.error(`Script ${i} has error:`);
            console.error(e.stderr);
        }
    });
}
