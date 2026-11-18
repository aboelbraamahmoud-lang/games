/* Stand-alone uncompressed ZIP writer: no CDN or dependency, compatible with Windows unzip. */
(function(){ 'use strict';
const encoder=new TextEncoder();
const table=new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);table[i]=c>>>0;}
function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=table[(c^bytes[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(v,n,x){v.setUint16(n,x,true)}function u32(v,n,x){v.setUint32(n,x>>>0,true)}
window.makeOfflineZip = function(files){
 let blocks=[],central=[],offset=0;
 for(const f of files){
  const name=encoder.encode(f.name),data=typeof f.data==='string'?encoder.encode(f.data):new Uint8Array(f.data),checksum=crc32(data);
  if(data.length>0xffffffff||offset>0xffffffff)throw Error('حجم الملف يتجاوز قدرة ZIP.');
  const head=new Uint8Array(30+name.length),v=new DataView(head.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,2048);u16(v,8,0);u16(v,10,0);u16(v,12,0);u32(v,14,checksum);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,name.length);u16(v,28,0);head.set(name,30);blocks.push(head,data);
  const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
  u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,2048);u16(cv,10,0);u16(cv,12,0);u16(cv,14,0);u32(cv,16,checksum);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u16(cv,30,0);u16(cv,32,0);u16(cv,34,0);u16(cv,36,0);u32(cv,38,0);u32(cv,42,offset);ch.set(name,46);central.push(ch);offset+=head.length+data.length;
 }
 const csize=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 u32(e,0,0x06054b50);u16(e,4,0);u16(e,6,0);u16(e,8,files.length);u16(e,10,files.length);u32(e,12,csize);u32(e,16,offset);u16(e,20,0);
 return new Blob([...blocks,...central,end],{type:'application/zip'});
};
})();
