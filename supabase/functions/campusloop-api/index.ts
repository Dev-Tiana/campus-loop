import {handleApi} from "../../../worker/api.js";

const base = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!base || !key) throw new Error("Supabase server credentials are required.");

const auth = {apikey: key, Authorization: "Bearer " + key};

async function check(response: Response) {
  if (!response.ok) throw new Error("Supabase request failed: " + response.status);
  return response;
}

const stateApi = base + "/rest/v1/campusloop_state";
const marketplaceStore = {
  async initialize(state: unknown) {
    await check(await fetch(stateApi, {
      method: "POST",
      headers: {...auth, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal"},
      body: JSON.stringify({id: "state", state})
    }));
  },
  async read() {
    const response = await check(await fetch(stateApi + "?id=eq.state&select=state,revision", {headers: auth}));
    const [row] = await response.json();
    return row && {...row, state: JSON.stringify(row.state)};
  },
  async write(state: string, revision: number) {
    const response = await check(await fetch(stateApi + "?id=eq.state&revision=eq." + revision, {
      method: "PATCH",
      headers: {...auth, "Content-Type": "application/json", Prefer: "return=representation"},
      body: JSON.stringify({state: JSON.parse(state), revision: revision + 1})
    }));
    return (await response.json()).length === 1;
  }
};

const objectUrl = (id: string) => base + "/storage/v1/object/campusloop-media/" + encodeURIComponent(id);
const bucket = {
  async put(id: string, bytes: Uint8Array, options: {httpMetadata: {contentType: string}}) {
    await check(await fetch(objectUrl(id), {
      method: "POST",
      headers: {...auth, "Content-Type": options.httpMetadata.contentType, "x-upsert": "true"},
      body: bytes
    }));
  },
  async get(id: string) {
    const response = await fetch(objectUrl(id), {headers: auth});
    return response.status === 404 ? null : check(response);
  },
  async delete(id: string) {
    const response = await fetch(base + "/storage/v1/object/campusloop-media", {
      method: "DELETE", headers: {...auth, "Content-Type": "application/json"},
      body: JSON.stringify({prefixes: [id]})
    });
    if (response.status !== 404) await check(response);
  }
};

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const marker = url.pathname.indexOf("/api/");
  if (marker < 0) return new Response("Not found", {status: 404});
  url.pathname = url.pathname.slice(marker);
  // Keep the verified custom domain and existing staging site as exact approved origins.
  const configuredOrigin = Deno.env.get("CAMPUSLOOP_PUBLIC_ORIGIN") || "https://www.campusloopnaija.name.ng";
  const approvedOrigins = new Set([configuredOrigin, "https://www.campusloopnaija.name.ng", "https://campus-loop-staging.vercel.app"]);
  const requestOrigin = request.headers.get("origin");
  const publicOrigin = requestOrigin && approvedOrigins.has(requestOrigin) ? requestOrigin : configuredOrigin;
  try {
    return await handleApi(new Request(url, request), {
      marketplaceStore,
      BUCKET: bucket,
      PUBLIC_ORIGIN: publicOrigin,
      GOOGLE_CLIENT_ID: Deno.env.get("GOOGLE_CLIENT_ID") || "678659685763-5qhk2n9r18d9d1r46120ktdkd3glp26k.apps.googleusercontent.com",
      GOOGLE_MAPS_BROWSER_KEY: Deno.env.get("GOOGLE_MAPS_BROWSER_KEY"),
      GOOGLE_MAPS_SERVER_KEY: Deno.env.get("GOOGLE_MAPS_SERVER_KEY")
    });
  } catch (error) {
    console.error("Campus Loop API error", error);
    return Response.json({error: "The service is temporarily unavailable."}, {status: 503, headers: {"Cache-Control": "no-store"}});
  }
});
