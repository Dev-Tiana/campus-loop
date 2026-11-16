export async function compressPhoto(file,{flyer=false,maxDimension}={}){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20000000)throw Error('Choose a JPG, PNG or WebP photo under 20 MB.');
 const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');const scale=Math.min(1,(maxDimension ?? (flyer?2600:1400))/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let image=canvas.toDataURL('image/webp',flyer?.88:.78);if(image.length>(flyer?3300000:1000000))image=canvas.toDataURL('image/webp',.5);if(image.length>(flyer?3300000:1000000))throw Error('This photo is still too large. Try a smaller image.');return image;
}
