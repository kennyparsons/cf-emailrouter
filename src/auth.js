// src/auth.js
export async function isAuthorized(request, env) {
    const auth = request.headers.get("Authorization") || "";
    //console.log("Authorization header received:", auth);
  
    const expected = await env.API_AUTH.get(env.WORKER_NAME);
    if (!expected) {
      console.warn("No API key set for worker " + env.WORKER_NAME);
      return false;
    }
  
    const isValid = auth === `Bearer ${expected}`;
    return isValid;
  }