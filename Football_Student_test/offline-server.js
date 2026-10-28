/* Optional local server using Node.js, LAN disabled; offline only. */
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=8765,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.bin':'application/octet-stream','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
 try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let p=path.resolve(root,'.'+pathname);if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
 }catch(e){res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log('Football offline: http://127.0.0.1:'+port+'/'));
