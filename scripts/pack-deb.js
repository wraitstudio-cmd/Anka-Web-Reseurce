const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pkg = require('../package.json');
const version = pkg.version;
const distDir = path.join(__dirname, '../dist');
const srcUnpacked = path.join(distDir, 'linux-unpacked');
const finalDebPath = path.join(distDir, `anka-web_${version}_amd64.deb`);

function createTarball(filesList) {
    let blocks = [];
    let addedDirs = new Set();

    function addDirHeader(dirPath) {
        if (!dirPath || dirPath === '.' || addedDirs.has(dirPath)) return;
        const parent = path.dirname(dirPath).replace(/\\/g, '/');
        if (parent && parent !== '.') addDirHeader(parent);

        const header = Buffer.alloc(512);
        header.write(dirPath + '/', 0, 'utf8'); 
        header.write('0000755', 100); 
        header.write('0000000', 108); 
        header.write('0000000', 116); 
        header.write('00000000000', 124); 
        header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'), 136);
        header.write('5', 156); 
        header.write('ustar  ', 257);
        header.write('root', 265);
        header.write('root', 297);

        let checksum = 0;
        for (let i = 0; i < 512; i++) checksum += (i >= 148 && i < 156) ? 32 : header[i];
        header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);

        blocks.push(header);
        addedDirs.add(dirPath);
    }

    for (const file of filesList) {
        if (file.type === 'symlink') {
            const dirName = path.dirname(file.name).replace(/\\/g, '/');
            addDirHeader(dirName);

            const header = Buffer.alloc(512);
            header.write(file.name, 0, 'utf8');
            header.write('0000777', 100);
            header.write('0000000', 108);
            header.write('0000000', 116);
            header.write('00000000000', 124);
            header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'), 136);
            header.write('2', 156); 
            header.write(file.linkname, 157, 'utf8'); 
            header.write('ustar  ', 257);
            header.write('root', 265);
            header.write('root', 297);

            let checksum = 0;
            for (let i = 0; i < 512; i++) checksum += (i >= 148 && i < 156) ? 32 : header[i];
            header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);

            blocks.push(header);
            continue;
        }

        const dirName = path.dirname(file.name).replace(/\\/g, '/');
        addDirHeader(dirName);

        const size = file.content.length;
        const header = Buffer.alloc(512);

        header.write(file.name, 0, 'utf8');
        header.write(file.mode.toString(8).padStart(7, '0'), 100);
        header.write('0000000', 108);
        header.write('0000000', 116);
        header.write(size.toString(8).padStart(11, '0'), 124);
        header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'), 136);
        header.write('0', 156);
        header.write('ustar  ', 257);
        header.write('root', 265);
        header.write('root', 297);

        let checksum = 0;
        for (let i = 0; i < 512; i++) checksum += (i >= 148 && i < 156) ? 32 : header[i];
        header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);

        blocks.push(header);
        blocks.push(file.content);

        const remainder = size % 512;
        if (remainder !== 0) blocks.push(Buffer.alloc(512 - remainder));
    }

    blocks.push(Buffer.alloc(1024));
    return Buffer.concat(blocks);
}

function getAllFiles(dirPath, relativeTo, sizeObj, results = []) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const filePath = path.join(dirPath, entry.name);
        const relPath = path.relative(relativeTo, filePath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
            getAllFiles(filePath, relativeTo, sizeObj, results);
        } else {
            const stats = fs.statSync(filePath);
            sizeObj.total += stats.size;
            const isExe = entry.name === 'anka-web' || entry.name.endsWith('.so') || entry.name.includes('chrome-sandbox');
            results.push({
                name: relPath,
                content: fs.readFileSync(filePath),
                mode: isExe ? 0o755 : 0o644
            });
        }
    }
    return results;
}

function createArArchive(debianBinary, controlGz, dataGz) {
    const arr = [Buffer.from('!<arch>\n', 'ascii')];
    const files = [
        { name: 'debian-binary', data: debianBinary },
        { name: 'control.tar.gz', data: controlGz },
        { name: 'data.tar.gz', data: dataGz }
    ];

    files.forEach(f => {
        const header = Buffer.alloc(60);
        header.write(f.name.padEnd(16), 0, 'ascii');
        header.write(Math.floor(Date.now() / 1000).toString().padEnd(12), 16, 'ascii');
        header.write('0'.padEnd(6), 28, 'ascii');
        header.write('0'.padEnd(6), 34, 'ascii');
        header.write('100644'.padEnd(8), 40, 'ascii');
        header.write(f.data.length.toString().padEnd(10), 48, 'ascii');
        header.write('\x60\x0A', 58, 'ascii');

        arr.push(header);
        arr.push(f.data);
        if (f.data.length % 2 !== 0) arr.push(Buffer.from('\n', 'ascii'));
    });

    return Buffer.concat(arr);
}

try {
    console.log('📝 Kontrol dosyaları ve dinamik boyutlar hesaplanıyor...');
    
    let sizeObj = { total: 0 };
    const appFiles = getAllFiles(srcUnpacked, srcUnpacked, sizeObj);
    const installedSizeKb = Math.ceil(sizeObj.total / 1024);

   let controlContent = fs.readFileSync(path.join(__dirname, '../debian-control.txt'), 'utf8').replace(/\r\n/g, '\n').trim();
    if (!controlContent.includes('Installed-Size:')) {
        controlContent += `\nInstalled-Size: ${installedSizeKb}`;
    } else {
        controlContent = controlContent.replace(/Installed-Size:\s*\d+/g, `Installed-Size: ${installedSizeKb}`);
    }
    controlContent += '\n';

    const postinstContent = `#!/bin/sh
set -e
chmod 4755 /opt/anka-web/chrome-sandbox 2>/dev/null || true
chmod +x /opt/anka-web/anka-web
update-desktop-database -q
exit 0
`.replace(/\r\n/g, '\n');

    const controlTar = createTarball([
        { name: 'control', content: Buffer.from(controlContent, 'utf8'), mode: 0o644 },
        { name: 'postinst', content: Buffer.from(postinstContent, 'utf8'), mode: 0o755 }
    ]);
    const controlGz = zlib.gzipSync(controlTar);

    console.log('📦 Uygulama katmanları inşa ediliyor...');
    let dataFiles = [];
const iconPath = path.join(__dirname, '../icons/logo.png');
const desktopContent = fs.readFileSync(path.join(__dirname, '../anka-web.desktop'), 'utf8');

dataFiles.push({
    name: 'usr/share/applications/anka-web.desktop',
    content: Buffer.from(desktopContent, 'utf8'),
    mode: 0o644
});

dataFiles.push({
    name: 'usr/bin/anka-web',
    type: 'symlink',
    linkname: '/opt/anka-web/anka-web'
});

if (fs.existsSync(iconPath)) {
    dataFiles.push({
        name: 'usr/share/pixmaps/anka-web.png',
        content: fs.readFileSync(iconPath),
        mode: 0o644
    });
} else {
    console.log('⚠️ Uyarı: icons/logo.png dosyası bulunamadı, ikon pakete eklenemedi.');
}

    appFiles.forEach(f => {
        dataFiles.push({
            name: 'opt/anka-web/' + f.name,
            content: f.content,
            mode: f.mode
        });
    });

    const dataTar = createTarball(dataFiles);
    const dataGz = zlib.gzipSync(dataTar);

    console.log('⚡ Standart ar arşiv blokları sıkıştırılıyor...');
    const debianBinary = Buffer.from('2.0\n', 'utf8');
    const finalDebBuffer = createArArchive(debianBinary, controlGz, dataGz);

    if (fs.existsSync(finalDebPath)) fs.unlinkSync(finalDebPath);
    fs.writeFileSync(finalDebPath, finalDebBuffer);

    console.log(`\n✨ BAŞARILI! Hatalardan Arındırılmış Debian Paketi Hazır:\n👉 dist/anka-web_${version}_amd64.deb`);

} catch (error) {
    console.error('❌ Derleme sırasında kritik hata:', error);
}