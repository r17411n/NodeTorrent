import WebTorrent from 'webtorrent';
import http from 'http';
import mime from 'mime';
import { exec } from 'child_process';

let port = 8888;
let client = new WebTorrent();
let magnetURI = 'magnet:?xt=urn:btih:BF7B226C2130639CAC016EAF49E4E3124C93ADBE&dn=Eleanor.The.Great.2025.1080p.WEBRip.10Bit.DDP5.1.x265-NeoNoir&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=http%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ololosh.space%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dump.cl%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.bittor.pw%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce&tr=udp%3A%2F%2Fretracker01-msk-virt.corbina.net%3A80%2Fannounce&tr=udp%3A%2F%2Fopen.free-tracker.ga%3A6969%2Fannounce&tr=udp%3A%2F%2Fns-1.x-fins.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce';

console.log('Adding Magnet Link to NodeTorrent queue: ', magnetURI.substring(0, 120), '...');

client.add(magnetURI, torrent => {
  let file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));

  console.log('Torrent info hash:', torrent.infoHash);

  if (!file) {
    console.error('No playable video file inside the torrent.');
    return;
  }

  let server = http.createServer((req, res) => {
    let range = req.headers.range;
    let fileSize = file.length;
    let mimeType = mime.getType(file.name) || 'video/mp4';

    if (!range) {
      let stream = file.createReadStream({ start, end });

      res.writeHead(200, {'Content-Length': fileSize, 'Content-Type': mimeType});
      
      req.on('start', () => {
        console.log('Client connected');
      });

      stream.on('error', err => {
        console.error('Stream Error:', err);
        res.end();
      });

      req.on('close', () => {
        stream.destroy();
        console.log('Client disconnected');
      });

      stream.pipe(res);
    } else {
      let [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      let start = parseInt(startStr, 10);
      let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      let chunkSize = end - start + 1;
      let stream = file.createReadStream({ start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType
      });

      req.on('start', () => {
        console.log('Client connected');
      });
      
      stream.on('error', err => {
        console.error('Stream error:', err);
        res.end();
      });
      
      req.on('close', () => {
        console.log('Client disconnected');
        stream.destroy();
      });

      torrent.on('download', () => {
        let progress = (torrent.progress * 100).toFixed(2);
        let uploaded = (torrent.uploaded / 1024).toFixed(2);
        let downloaded = (torrent.downloaded / 1024).toFixed(2);
        let ratio = (uploaded / downloaded).toFixed(2);
        let peers = torrent.numPeers;
        let seeders = torrent.numSeeds;
        let uploadSpeed = (torrent.uploadSpeed / 1024).toFixed(2);
        let downloadSpeed = (torrent.downloadSpeed / 1024).toFixed(2);
        let speeds = `↓ ${downloadSpeed} kB/s ↑ ${uploadSpeed} kB/s`;

        if (torrent.state == 'undefined') {
          if (typeof seeders === 'undefined') {
            seeders = 0;
          }
          if (progress < 100) {
            console.log(`Progress: ${progress}% - Speed: ${speeds}`);
            console.log(`Uploaded: ${(uploaded/1024).toFixed(2)} MB - Downloaded: ${(downloaded/1024).toFixed(2)} MB - Ratio: ${ratio} - Peers: ${peers} - Seeders: ${seeders}`);
          }
        } else if (torrent.state === 'seeding') {
          console.log(`Seeding - Uploaded: ${(uploaded/1024).toFixed(2)} MB - Ratio: ${ratio} - Peers: ${peers} - Seeders: ${seeders}`);
        } else {
          console.log(`Status: ${torrent.state}`);
        }
      });

      stream.pipe(res);
    }
  });

  server.listen(port, () => {
    console.log(`Streaming on http://localhost:${port}`);
    console.log('Launching VLC player...');

    exec(`vlc --network-caching=1000 http://localhost:${port}`, err => {

      if (err) {
        console.error('Failed to launch VLC:', err);
      } else {
        console.log('VLC player closed');
      }
    });
  });
});