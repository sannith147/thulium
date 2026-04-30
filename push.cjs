const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');
const http = require('isomorphic-git/http/node');

const dir = process.cwd();
const repoUrl = 'https://github.com/sannith147/thulium.git';

// Nuclear Option: Delete existing .git to ensure no index corruption
const gitDir = path.join(dir, '.git');
if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
    console.log('🗑️  Wiped old Git index.');
}

function getAllFiles(currentDir, allFiles = []) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'frontend/dist') {
                getAllFiles(filePath, allFiles);
            }
        } else {
            allFiles.push(path.relative(dir, filePath));
        }
    }
    return allFiles;
}

async function nuclearPush() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return;

    console.log('🚀 Initializing Fresh Repository...');
    await git.init({ fs, dir });

    const allFiles = getAllFiles(dir);
    console.log(`📦 Staging ${allFiles.length} files...`);
    for (const filepath of allFiles) {
        if (filepath.includes('push')) continue;
        await git.add({ fs, dir, filepath });
    }

    console.log('💾 Creating Final Commit...');
    await git.commit({
        fs, dir,
        author: { name: 'Antigravity', email: 'ai@antigravity.google' },
        message: '🚀 FINAL DEPLOYMENT SYNC: All fixes included'
    });

    console.log('🔗 Connecting to Remote...');
    await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl });

    console.log('📤 Pushing to master (Force Overwrite)...');
    const result = await git.push({
        fs, http, dir,
        remote: 'origin',
        ref: 'master',
        force: true,
        onAuth: () => ({ username: token, password: '' })
    });

    if (result.ok) {
        console.log('✅ NUCLEAR SYNC SUCCESSFUL!');
        console.log('Wait 10 seconds for GitHub to update its UI.');
    } else {
        console.error('❌ Push failed:', result);
    }
}

nuclearPush().catch(console.error);

