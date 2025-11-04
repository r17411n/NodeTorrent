// Replace require() with import
import WebTorrent from 'webtorrent';
import http from 'http';
import mime from 'mime';
import { exec } from 'child_process';

const client = new WebTorrent();
const PORT = 8888;

// Contain magnet URI or .torrent file path here
let magnetURI = 'magnet:?xt=urn:btih:D6F88F62AF28D3438938D4F44DB31DBA827C12C4&dn=Anemone.2025.1080p.WEBRip.10Bit.DDP5.1.x265-NeoNoir&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=http%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ololosh.space%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dump.cl%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.bittor.pw%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce&tr=udp%3A%2F%2Fretracker01-msk-virt.corbina.net%3A80%2Fannounce&tr=udp%3A%2F%2Fopen.free-tracker.ga%3A6969%2Fannounce&tr=udp%3A%2F%2Fns-1.x-fins.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce';

console.log('Adding Magnet Link to NodeTorrent queue: ', magnetURI.substring(0, 120), '...');

client.add(magnetURI, torrent => {

  const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));

  if (!file) {

    console.error('No playable video file found in torrent.');
    
    return;

  }

  const server = http.createServer((req, res) => {

    const range = req.headers.range;
    const fileSize = file.length;
    const mimeType = mime.getType(file.name) || 'video/mp4';

    if (!range) {

      res.writeHead(200, {

        'Content-Length': fileSize,

        'Content-Type': mimeType

      });

      const stream = file.createReadStream({ start, end });

      stream.on('error', err => {

        console.error('Stream error:', err);

        res.end();

      });
      
      req.on('close', () => {

        
        stream.destroy();

        console.log('Client disconnected');

      });

      torrent.on('download', () => {

        console.log(`Progress: ${(torrent.progress * 100).toFixed(2)}%`);

      }); 

      stream.pipe(res);

    } else {

      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');

      const start = parseInt(startStr, 10);
 
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
  
      const chunkSize = end - start + 1;

      res.writeHead(206, {

        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType

      });

      const stream = file.createReadStream({ start, end });

      stream.on('error', err => {

        console.error('Stream error:', err);

        res.end();

      });
      
      req.on('close', () => {

        console.log('Client disconnected');

        stream.destroy();

      });

      torrent.on('download', () => {

        if (torrent.progress * 100 <= 100) { console.log(`Progress: ${(torrent.progress * 100).toFixed(2)}%`); }

      }); 

      stream.pipe(res);

    }

  });

  server.listen(PORT, () => {

    console.log(`Streaming on http://localhost:${PORT}`);

    console.log('Launching VLC player...');

    exec(`vlc --network-caching=1000 http://localhost:${PORT}`, err => {

      if (err) {

        console.error('Failed to launch VLC:', err);

      } else {

        console.log('VLC player closed');

      }

    });

  });

});