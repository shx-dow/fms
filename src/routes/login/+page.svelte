<script lang="ts">
  let { form }: { form: { error?: string } | undefined } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Sign in · Faculty Reporting System</title></svelte:head>

<main class="login-shell">
  <div class="login-card">
    <div class="card-header">
      <img src="/icfaitech_jaipur_cover.webp" alt="IcfaiTech" class="login-logo" />
      <span class="card-sub">Faculty Reporting System</span>
    </div>
    <div class="card-divider"></div>
    <form method="POST" onsubmit={() => (submitting = true)}>
      <label for="email">
        Email address
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          required
          placeholder="name@university.edu"
        />
      </label>
      <label for="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="Enter your password"
        />
      </label>
      {#if form?.error}<div class="login-error" role="alert">{form.error}</div>{/if}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p class="login-support">For access assistance, contact your department administrator.</p>
  </div>
</main>
<footer class="login-footer">Internal university application · Academic year 2026–27</footer>

<style>
  :global(body) { background: #f7f9f8; color: var(--navy); }
  .login-shell {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 32px 24px;
  }
  .login-card {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 40px 36px 32px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }
  .card-header { text-align: center; margin-bottom: 24px; }
  .login-logo { display: block; max-width: 170px; height: auto; margin: 0 auto 12px; }
  .card-sub { display: block; color: var(--muted); font-size: 0.76rem; font-weight: 500; letter-spacing: 0.01em; }
  .card-divider { height: 1px; background: var(--line-2); margin: 0 -36px 28px; }
  form { display: grid; gap: 16px; }
  label {
    display: block; color: var(--muted);
    font-size: 0.74rem; font-weight: 700;
  }
  input {
    display: block; width: 100%; margin-top: 6px; padding: 11px 12px;
    border: 1px solid var(--line); border-radius: 6px;
    background: var(--panel); color: var(--navy);
    font: inherit; font-size: 0.86rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input::placeholder { color: var(--muted-3); }
  input:focus {
    outline: none; border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  button {
    margin-top: 4px; border: 0; border-radius: 6px;
    background: var(--navy); color: var(--paper);
    padding: 12px; font: inherit; font-size: 0.82rem; font-weight: 800;
    cursor: pointer; transition: background 0.15s;
  }
  button:hover { background: var(--blue-hover); }
  button:disabled { opacity: 0.55; cursor: not-allowed; }
  .login-error {
    background: var(--red-bg); border: 1px solid var(--red-border); border-radius: 6px;
    color: var(--red); padding: 9px 10px; font-size: 0.75rem;
  }
  .login-support {
    color: var(--muted-2); font-size: 0.7rem; line-height: 1.5;
    margin: 22px 0 0; text-align: center;
  }
  .login-footer {
    position: fixed; bottom: 22px; left: 0; right: 0;
    text-align: center; color: var(--muted-3); font-size: 0.68rem;
  }
</style>
