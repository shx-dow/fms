<script lang="ts">
  let { form }: { form: { error?: string } | undefined } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Sign in · Faculty Reporting System</title></svelte:head>

<main class="simple-login">
  <section class="login-card">
    <div class="simple-brand"><span class="crest">U</span><div><strong>University</strong><small>Faculty Reporting System</small></div></div>
    <h1>Sign in</h1>
    <form method="POST" onsubmit={() => submitting = true}>
      <label for="email">Email address<input id="email" name="email" type="email" autocomplete="username" required placeholder="name@university.edu" autofocus /></label>
      <label for="password">Password<input id="password" name="password" type="password" autocomplete="current-password" required /></label>
      {#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p class="support">For access assistance, contact your department administrator.</p>
  </section>
  <footer>Internal university application · Academic year 2026–27</footer>
</main>

<style>
  :global(body){background:#f5f4ef;color:#1b2b36}.simple-login{min-height:100vh;display:grid;place-items:center;padding:24px}.login-card{width:100%;max-width:390px}.simple-brand{display:flex;align-items:center;gap:10px;margin-bottom:52px}.simple-brand strong,.simple-brand small{display:block}.simple-brand strong{font-size:.9rem}.simple-brand small{color:#71818a;font-size:.7rem;margin-top:2px}.crest{width:30px;height:30px;border:1px solid #9eafb7;border-radius:5px;display:grid;place-items:center;color:#172a3a;font-weight:800}.login-card h1{font-size:1.8rem;letter-spacing:-.04em;margin:11px 0 5px}.login-card form{display:grid;gap:17px}.login-card label{display:block;color:#40535f;font-size:.75rem;font-weight:750}.login-card input{display:block;width:100%;margin-top:7px;padding:11px;border:1px solid #c8d5da;border-radius:5px;background:#fdfcf9;color:#1b2b36;font:inherit;font-size:.86rem}.login-card input:focus{outline:3px solid #cdebe6;border-color:#087f73}.login-card button{margin-top:3px;border:0;border-radius:5px;background:#172a3a;color:#f5f4ef;padding:12px;font:inherit;font-size:.82rem;font-weight:800;cursor:pointer}.login-card button:hover{background:#29465b}.login-card button:disabled{opacity:.55;cursor:not-allowed}.error{background:#f9e9e7;border:1px solid #edc9c4;border-radius:5px;color:#8f413b;padding:9px 10px;font-size:.75rem}.support{color:#87969c;font-size:.72rem;line-height:1.5;margin:22px 0 0}.simple-login footer{position:fixed;bottom:22px;color:#87969c;font-size:.68rem}@media(max-width:500px){.simple-login{align-items:start;padding-top:70px}.simple-brand{margin-bottom:70px}.simple-login footer{position:static;margin-top:45px;text-align:center}}
</style>