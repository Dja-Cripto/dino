const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Rota GET para obter pontuações
  if (req.method === 'GET' && req.url === '/scores') {
    const scoresPath = path.join(PUBLIC_DIR, 'scores.json');
    fs.readFile(scoresPath, 'utf8', (err, data) => {
      let scores = [];
      if (!err && data) {
        try {
          scores = JSON.parse(data);
        } catch (e) {
          scores = [];
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(scores));
    });
    return;
  }

  // Rota POST para salvar pontuação
  if (req.method === 'POST' && req.url === '/scores') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.name || typeof entry.score !== 'number') {
          throw new Error('Nome ou pontuação inválidos');
        }

        const scoresPath = path.join(PUBLIC_DIR, 'scores.json');
        fs.readFile(scoresPath, 'utf8', (err, data) => {
          let scores = [];
          if (!err && data) {
            try {
              scores = JSON.parse(data);
            } catch (e) {
              scores = [];
            }
          }

          scores.push({
            name: entry.name.substring(0, 15).toUpperCase(),
            score: entry.score,
            avancode: entry.avancode ? entry.avancode.substring(0, 20).toUpperCase() : undefined,
            date: new Date().toISOString()
          });

          // Ordena de forma decrescente por pontuação
          scores.sort((a, b) => b.score - a.score);

          // Limita aos top 100
          scores = scores.slice(0, 100);

          fs.writeFile(scoresPath, JSON.stringify(scores, null, 2), 'utf8', (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: err.message }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', scores }));
          });
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // Rota POST para salvar configurações diretamente no arquivo
  if (req.method === 'POST' && req.url === '/save-config') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const newConfig = JSON.parse(body);
        const designPath = path.join(PUBLIC_DIR, 'design.js');

        // Cria o novo conteúdo do arquivo mantendo suporte de cache
        const updatedContent = `/**
 * CONFIGURAÇÃO VISUAL DO JOGO (design.js)
 * 
 * Este arquivo controla exclusivamente a aparência, escalas, offsets e imagens do jogo.
 * Nenhuma regra lógica ou física do jogo deve ser declarada aqui.
 */
const SavedDesignConfig = localStorage.getItem('dino_design_config');
let parsedConfig = null;
if (SavedDesignConfig) {
  try {
    const temp = JSON.parse(SavedDesignConfig);
    if (temp.player && temp.player.sprites && temp.player.sprites.jogador_idle) {
      parsedConfig = temp;
    } else {
      localStorage.removeItem('dino_design_config');
    }
  } catch (e) {
    localStorage.removeItem('dino_design_config');
  }
}
const DesignConfig = parsedConfig || ${JSON.stringify(newConfig, null, 2)};
`;

        fs.writeFileSync(designPath, updatedContent, 'utf8');
        console.log(`[Server] design.js atualizado com sucesso via Scene Editor!`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Configuração gravada no arquivo design.js com sucesso!' }));
      } catch (err) {
        console.error('[Server] Erro ao gravar design.js:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // Roteamento estático de arquivos
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Dino Server rodando em http://localhost:${PORT}`);
});
