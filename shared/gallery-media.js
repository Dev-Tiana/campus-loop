export const maxVideoBytes = 25 * 1024 * 1024;
export const galleryVideoTypes = ['video/mp4','video/webm'];

export function validGalleryVideo(bytes,type){
 if(!bytes || bytes.length < 16 || bytes.length > maxVideoBytes)return false;
 if(type==='video/mp4')return bytes.subarray(4,8).toString()==='ftyp';
 return type==='video/webm'&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
}

export function sendGalleryVideo(req,res,bytes){
 const total=bytes.length;
 res.set('Accept-Ranges','bytes');
 const range=req.get('range');
 if(!range)return res.send(bytes);
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!match||(!match[1]&&!match[2]))return res.status(416).set('Content-Range','bytes */'+total).send('');
 const start=match[1]?Number(match[1]):Math.max(0,total-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(total-1,Number(match[2])):total-1;
 if(start>=total||end<start)return res.status(416).set('Content-Range','bytes */'+total).send('');
 return res.status(206).set('Content-Range','bytes '+start+'-'+end+'/'+total).send(bytes.subarray(start,end+1));
}
