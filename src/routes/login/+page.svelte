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
        Official email or employee code
        <input
          id="email"
          name="email"
          type="text"
          autocomplete="username"
          required
          placeholder="name@iujaipur.edu.in or 39L03347"
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
  :global(body) { background: radial-gradient(1000px 380px at 50% -120px, rgba(79, 109, 155, 0.12), transparent 60%), #f7f9f8; color: var(--navy); }
  .login-shell {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 32px 24px;
  }
  .login-card {
    width: 100%;
    max-width: 410px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 42px 38px 34px;
    box-shadow: var(--shadow-lg);
  }
  .card-header { text-align: center; margin-bottom: 26px; }
  .login-logo { display: block; max-width: 176px; height: auto; margin: 0 auto 12px; }
  .card-sub { display: block; color: var(--text-3); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.01em; }
  .card-divider { height: 1px; background: var(--line-2); margin: 0 -38px 28px; }
  form { display: grid; gap: 16px; }
  label {
    display: block; color: var(--text-3);
    font-size: 0.76rem; font-weight: 700;
  }
  input {
    display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 12px 13px;
    border: 1px solid var(--line); border-radius: 8px;
    background: var(--bg-input); color: var(--text-1);
    font: inherit; font-size: 0.88rem;
    box-shadow: var(--shadow-xs);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input::placeholder { color: var(--muted-3); }
  input:focus {
    outline: none; border-color: var(--accent);
    box-shadow: var(--focus-ring);
  }
  button {
    margin-top: 4px; border: 1px solid var(--navy); border-radius: 8px;
    background: var(--navy); color: var(--paper);
    padding: 13px; font: inherit; font-size: 0.84rem; font-weight: 800;
    cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.15s;
  }
  button:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  button:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .login-error {
    background: var(--red-bg-alt); border: 1px solid var(--red-border); border-radius: 8px;
    color: var(--red-dark); padding: 10px 12px; font-size: 0.78rem; font-weight: 600;
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
