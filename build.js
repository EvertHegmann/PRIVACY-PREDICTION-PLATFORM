const fs = require('fs');
const path = require('path');

console.log('🚀 Building static site...');
console.log('📍 Working directory:', __dirname);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
console.log('📁 Target directory:', publicDir);

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('✅ Created public directory');
} else {
    console.log('📁 Public directory already exists');
}

// Copy index.html to public directory
const sourceFile = path.join(__dirname, 'index.html');
const targetFile = path.join(publicDir, 'index.html');

console.log('📄 Source file:', sourceFile);
console.log('📄 Target file:', targetFile);

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
    console.error('❌ Source file index.html not found!');
    console.log('📋 Available files:', fs.readdirSync(__dirname));
    process.exit(1);
}

try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log('✅ Copied index.html to public/');

    // Verify the copy was successful
    if (fs.existsSync(targetFile)) {
        const stats = fs.statSync(targetFile);
        console.log(`📊 File size: ${stats.size} bytes`);
        console.log('🎉 Build completed successfully!');
    } else {
        throw new Error('File copy verification failed');
    }
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}