const hostname = 'campus-loop-staging-git-redesign-com-a26859-dev-tianas-projects.vercel.app';
const backend = 'https://qmyhjpjfcilngiijrjre.supabase.co/functions/v1/campusloop-redesign';
export const config = {api:{bodyParser:false}};

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if (req.headers.host !== hostname || !process.env.CAMPUSLOOP_REDESIGN_GATE) return res.status(404).end();
  const url = new URL(req.url,'https://'+hostname);
  const path = req.query.previewPath;
  if (typeof path !== 'string' || !/^[\w/-]+$/.test(path)) return res.status(400).end();
  url.searchParams.delete('previewPath');
  const headers = new Headers({'x-redesign-gate':process.env.CAMPUSLOOP_REDESIGN_GATE});
  for (const name of ['origin','sec-fetch-site','content-type','cookie','accept','range']) {
    if(typeof req.headers[name]==='string') headers.set(name,req.headers[name]);
  }
  const options = {method:req.method,headers,redirect:'manual'};
  if (!['GET','HEAD'].includes(req.method)) {
    if (req.headers.origin !== 'https://'+hostname) return res.status(403).json({error:'Request origin unavailable.'});
    options.body=req;
    options.duplex='half';
  }
  try {
    const response=await fetch(backend+'/api/'+path+url.search,options);
    for(const key of ['content-type','content-range','accept-ranges','location']) {
      if(response.headers.has(key)) res.setHeader(key,response.headers.get(key));
    }
    const cookies=response.headers.getSetCookie();
    if(cookies.length) res.setHeader('set-cookie',cookies);
    res.status(response.status).end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(502).json({error:'The preview service is temporarily unavailable.'});
  }
}
