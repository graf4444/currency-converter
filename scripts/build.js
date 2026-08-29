#!/usr/bin/env node

/**
 * Currency Converter Build & Version Bump Utility
 * 
 * Usage:
 *   node scripts/build.js             # Bumps minor by default (e.g. 1.2.0 -> 1.3.0) + updates timestamp
 *   node scripts/build.js --minor     # Bumps minor (e.g. 1.2.0 -> 1.3.0)
 *   node scripts/build.js --patch     # Bumps patch (e.g. 1.2.0 -> 1.2.1)
 *   node scripts/build.js --major     # Bumps major (e.g. 1.2.0 -> 2.0.0)
 *   node scripts/build.js --time-only # Updates timestamp only without changing version
 *   node scripts/build.js 1.4.0       # Sets specific version
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONSTANTS_PATH = path.join(ROOT_DIR, 'js', 'constants.js');
const SW_PATH = path.join(ROOT_DIR, 'sw.js');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');

// 1. Format current local timestamp (YYYY-MM-DD HH:mm)
function getFormattedTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// 2. Read existing version from constants.js
function getCurrentVersion() {
    if (!fs.existsSync(CONSTANTS_PATH)) return '1.0.0';
    const content = fs.readFileSync(CONSTANTS_PATH, 'utf8');
    const match = content.match(/version:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '1.0.0';
}

// 3. Compute next version
function computeNextVersion(current, mode) {
    const semMatch = current.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
    
    if (!semMatch) {
        return current;
    }

    let major = parseInt(semMatch[1], 10);
    let minor = parseInt(semMatch[2], 10);
    let patch = parseInt(semMatch[3], 10);
    const extra = semMatch[4] || '';

    if (mode === 'major') {
        major += 1;
        minor = 0;
        patch = 0;
    } else if (mode === 'patch') {
        patch += 1;
    } else if (mode === 'minor') {
        minor += 1;
        patch = 0;
    } else if (mode === 'time-only') {
        return current;
    } else if (mode && /^\d+\.\d+\.\d+/.test(mode)) {
        return mode;
    } else {
        // default bump is minor
        minor += 1;
        patch = 0;
    }

    return `${major}.${minor}.${patch}${extra}`;
}

function run() {
    const args = process.argv.slice(2);
    let mode = 'minor';

    if (args.includes('--minor')) mode = 'minor';
    else if (args.includes('--patch')) mode = 'patch';
    else if (args.includes('--major')) mode = 'major';
    else if (args.includes('--time-only')) mode = 'time-only';
    else if (args[0] && !args[0].startsWith('--')) mode = args[0];

    const currentVersion = getCurrentVersion();
    const newVersion = computeNextVersion(currentVersion, mode);
    const timestamp = getFormattedTimestamp();

    console.log(`🚀 Building Currency Converter:`);
    console.log(`   Version: ${currentVersion} -> ${newVersion}`);
    console.log(`   Build Time: ${timestamp}`);

    // Update js/constants.js
    if (fs.existsSync(CONSTANTS_PATH)) {
        let content = fs.readFileSync(CONSTANTS_PATH, 'utf8');
        content = content.replace(
            /const APP_CONFIG = \{[\s\S]*?\};/,
            `const APP_CONFIG = {\n    version: '${newVersion}',\n    buildTime: '${timestamp}'\n};`
        );
        fs.writeFileSync(CONSTANTS_PATH, content, 'utf8');
        console.log(`   ✓ Updated js/constants.js`);
    }

    // Update index.html fallback
    if (fs.existsSync(INDEX_PATH)) {
        let content = fs.readFileSync(INDEX_PATH, 'utf8');
        content = content.replace(
            /<div id="app-version" class="app-version">[^<]*<\/div>/,
            `<div id="app-version" class="app-version">v${newVersion} (${timestamp})</div>`
        );
        fs.writeFileSync(INDEX_PATH, content, 'utf8');
        console.log(`   ✓ Updated index.html`);
    }

    // Update sw.js CACHE_NAME
    if (fs.existsSync(SW_PATH)) {
        let content = fs.readFileSync(SW_PATH, 'utf8');
        const cacheMatch = content.match(/const CACHE_NAME = 'currency-converter-v(\d+)';/);
        if (cacheMatch) {
            const nextCacheNum = parseInt(cacheMatch[1], 10) + 1;
            content = content.replace(
                /const CACHE_NAME = 'currency-converter-v\d+';/,
                `const CACHE_NAME = 'currency-converter-v${nextCacheNum}';`
            );
            fs.writeFileSync(SW_PATH, content, 'utf8');
            console.log(`   ✓ Bumped sw.js cache to v${nextCacheNum}`);
        }
    }

    // Update package.json if present
    if (fs.existsSync(PACKAGE_PATH)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
            pkg.version = newVersion;
            fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            console.log(`   ✓ Updated package.json`);
        } catch (_) {}
    }

    console.log(`\n✨ Build complete! v${newVersion} (${timestamp})\n`);
}

run();
