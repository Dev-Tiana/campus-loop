export const adminToken=req=>/(?:^|;\s*)campus_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
export function adminFrom(state,req){const session=(state.adminSessions || []).find(s=>s.token===adminToken(req)&&s.expires>Date.now());return session&&(state.adminUsers || []).find(a=>a.id===session.admin&&a.active!==false);}
export const adminSafe=a=>a?{id:a.id,name:a.name,email:a.email,campus:a.campus}:null;
