const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pkg = require('./package.json');
const version = pkg.version;
const distDir = path.join(__dirname, 'dist');
const srcUnpacked = path.join(distDir, 'linux-unpacked');
const finalDebPath = path.join(distDir, `anka-web_${version}_amd64.deb`);

console.log('🚀 Saf Node.js ile gerçek Debian paketi inşası başladı...');


function createTarball(filesList) {
    let blocks = [];

    for (const file of filesList) {
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


function getAllFiles(dirPath, relativeTo) {
    let results = [];
    const list = fs.readdirSync(dirPath);
    list.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        const relPath = path.relative(relativeTo, filePath).replace(/\\/g, '/');

        if (stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath, relativeTo));
        } else {

            const isExe = file === 'anka-web';
            results.push({
                name: relPath,
                content: fs.readFileSync(filePath),
                mode: isExe ? 0o755 : 0o644
            });
        }
    });
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

    console.log('📝 Kontrol dosyaları hazırlanıyor...');
    const controlContent = fs.readFileSync(path.join(__dirname, 'debian-control.txt'), 'utf8').replace(/\r\n/g, '\n').trim() + '\n';
const postinstContent = `#!/bin/sh
set -e

# Çalıştırılabilir dosyaya izin ver
chmod +x /opt/anka-web/anka-web

# Başlat menüsü kısayolunu ayarla ve izinlerini ver
chown root:root /usr/share/applications/anka-web.desktop
chmod 644 /usr/share/applications/anka-web.desktop

# Giriş yapan tüm kullanıcıların masaüstüne kısayolu otomatik kopyala
for user_dir in /home/*; do
    if [ -d "$user_dir" ]; then
        # Kullanıcının masaüstü klasörünü bul (Masaüstü veya Desktop olabilir)
        for desktop_dir in "$user_dir/Masaüstü" "$user_dir/Desktop"; do
            if [ -d "$desktop_dir" ]; then
                cp /usr/share/applications/anka-web.desktop "$desktop_dir/"
                # Dosya sahibini o kullanıcı yap ki tıklayınca izin hatası vermesin
                username=$(basename "$user_dir")
                chown "$username:$username" "$desktop_dir/anka-web.desktop"
                chmod +x "$desktop_dir/anka-web.desktop"
            fi
        done
    fi
done

# Linux masaüstü veritabanını yenile
update-desktop-database -q
exit 0
`.replace(/\r\n/g, '\n');

    const controlTar = createTarball([
        { name: 'control', content: Buffer.from(controlContent, 'utf8'), mode: 0o644 },
        { name: 'postinst', content: Buffer.from(postinstContent, 'utf8'), mode: 0o755 }
    ]);
    const controlGz = zlib.gzipSync(controlTar);


    console.log('📦 Uygulama dosyaları paketleniyor (Bu biraz sürebilir)...');
    let dataFiles = [];


    const desktopContent = fs.readFileSync(path.join(__dirname, 'anka-web.desktop'), 'utf8');
    dataFiles.push({
        name: 'usr/share/applications/anka-web.desktop',
        content: Buffer.from(desktopContent, 'utf8'),
        mode: 0o644
    });


    const appFiles = getAllFiles(srcUnpacked, srcUnpacked);
    appFiles.forEach(f => {
        dataFiles.push({
            name: 'opt/anka-web/' + f.name,
            content: f.content,
            mode: f.mode
        });
    });

    const dataTar = createTarball(dataFiles);
    const dataGz = zlib.gzipSync(dataTar);


    console.log('⚡ Öz hakiki Debian formatında birleştiriliyor...');
    const debianBinary = Buffer.from('2.0\n', 'utf8');

    const finalDebBuffer = createArArchive(debianBinary, controlGz, dataGz);

    if (fs.existsSync(finalDebPath)) fs.unlinkSync(finalDebPath);
    fs.writeFileSync(finalDebPath, finalDebBuffer);

    console.log(`\n✨ SÜPER! %100 Orijinal Linux Uyumlu Paket Hazır:\n👉 dist/anka-web_${version}_amd64.deb`);

} catch (error) {
    console.error('❌ Hata oluştu:', error);
}