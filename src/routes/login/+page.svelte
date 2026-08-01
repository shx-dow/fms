<script lang="ts">
  let { form }: { form: { error?: string } | undefined } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Sign in · Faculty Reporting System</title></svelte:head>

<main class="login-shell">
  <section class="login-card">
    <div class="login-brand">
      <span class="login-crest">I</span>
      <div><strong>The ICFAI University, Jaipur</strong><small>Faculty Reporting</small></div>
    </div>
    <h1>Sign in</h1>
    <form method="POST" onsubmit={() => (submitting = true)}>
      <label for="email"
        >Email address<input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          required
          placeholder="name@university.edu"
        /></label
      >
      <label for="password"
        >Password<input id="password" name="password" type="password" autocomplete="current-password" required /></label
      >
      {#if form?.error}<div class="login-error" role="alert">{form.error}</div>{/if}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p class="login-support">For access assistance, contact your department administrator.</p>
  </section>
  <footer>Internal university application · Academic year 2026–27</footer>
</main>

<style>
  :global(body) { background: #f4f6f5; color: #17252d; }
  .login-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .login-card { width: 100%; max-width: 390px; }
  .login-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 52px; }
  .login-brand strong, .login-brand small { display: block; }
  .login-brand strong { font-size: 0.86rem; }
  .login-brand small { color: #667477; font-size: 0.7rem; margin-top: 2px; }
  .login-crest { width: 31px; height: 31px; border: 1px solid #bdd3db; border-radius: 7px; display: grid; place-items: center; color: #145b78; font-weight: 800; }
  .login-card h1 { font-size: 1.9rem; letter-spacing: -0.04em; margin: 0 0 24px; }
  .login-card form { display: grid; gap: 18px; }
  .login-card label { display: block; color: #3b525c; font-size: 0.75rem; font-weight: 750; }
  .login-card input { display: block; width: 100%; margin-top: 7px; padding: 11px; border: 1px solid #dbe3e7; border-radius: 6px; background: #fdfcf9; color: #17252d; font: inherit; font-size: 0.86rem; }
  .login-card input:focus { outline: 3px solid #d4eaf0; border-color: #145b78; }
  .login-card button { margin-top: 4px; border: 0; border-radius: 6px; background: #17252d; color: #f4f6f5; padding: 12px; font: inherit; font-size: 0.82rem; font-weight: 800; cursor: pointer; }
  .login-card button:hover { background: #294a5a; }
  .login-card button:disabled { opacity: 0.55; cursor: not-allowed; }
  .login-error { background: #f9e9e7; border: 1px solid #edc9c4; border-radius: 6px; color: #8f413b; padding: 9px 10px; font-size: 0.75rem; }
  .login-support { color: #87969c; font-size: 0.72rem; line-height: 1.5; margin: 24px 0 0; }
  .login-shell footer { position: fixed; bottom: 22px; color: #87969c; font-size: 0.68rem; }
  @media (max-width: 500px) {
    .login-shell { align-items: start; padding-top: 70px; }
    .login-brand { margin-bottom: 58px; }
    .login-shell footer { position: static; margin-top: 45px; text-align: center; }
  }
</style>