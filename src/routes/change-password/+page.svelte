<script lang="ts">
  import { goto } from '$app/navigation';
  import { show } from '$lib/stores/toast.svelte.ts';
  let current = $state('');
  let next = $state('');
  let confirm = $state('');
  let saving = $state(false);
  let error = $state('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    if (!current || !next || !confirm) { error = 'Fill in all three fields.'; return; }
    if (next !== confirm) { error = 'New passwords do not match.'; return; }
    if (next === current) { error = 'Choose a password different from your temporary one.'; return; }
    saving = true;
    try {
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { error = d.error ?? 'Could not change password.'; return; }
      show('Password updated. Welcome in.');
      await goto('/dashboard');
    } catch {
      error = 'Could not reach the server. Try again.';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Set a new password · Faculty Reporting System</title></svelte:head>

<main class="login-shell">
  <div class="login-card">
    <div class="card-header">
      <img src="/icfaitech_jaipur_cover.webp" alt="IcfaiTech" class="login-logo" />
      <span class="card-sub">Faculty Reporting System</span>
    </div>
    <div class="card-divider"></div>
    <h1>Choose your own password</h1>
    <p class="cp-sub">You are signing in with a temporary password. Set a private one to continue.</p>
    <form onsubmit={submit}>
      <label for="cp-current">
        Temporary password
        <input id="cp-current" type="password" autocomplete="current-password" required bind:value={current} placeholder="Issued temporary password" />
      </label>
      <label for="cp-next">
        New password
        <input id="cp-next" type="password" autocomplete="new-password" required bind:value={next} placeholder="At least 8 characters" />
      </label>
      <label for="cp-confirm">
        Confirm new password
        <input id="cp-confirm" type="password" autocomplete="new-password" required bind:value={confirm} placeholder="Repeat the new password" />
      </label>
      {#if error}<div class="login-error" role="alert">{error}</div>{/if}
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Set password and continue'}</button>
    </form>
  </div>
</main>
<footer class="login-footer">Internal university application · Academic year 2026–27</footer>

<style>
  :global(body) { background: radial-gradient(1000px 380px at 50% -120px, rgba(79, 109, 155, 0.12), transparent 60%), #f7f9f8; color: var(--navy); }
  .login-shell { position: fixed; inset: 0; display: grid; place-items: center; padding: 32px 24px; overflow-y: auto; }
  .login-card { width: 100%; max-width: 410px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 42px 38px 34px; box-shadow: var(--shadow-lg); margin: auto; }
  .card-header { text-align: center; margin-bottom: 26px; }
  .login-logo { display: block; max-width: 176px; height: auto; margin: 0 auto 12px; }
  .card-sub { display: block; color: var(--text-3); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.01em; }
  .card-divider { height: 1px; background: var(--line-2); margin: 0 -38px 24px; }
  h1 { font-size: 1.25rem; letter-spacing: -0.02em; margin: 0 0 6px; font-weight: 750; color: var(--text-1); }
  .cp-sub { margin: 0 0 20px; color: var(--text-3); font-size: 0.8rem; line-height: 1.5; }
  form { display: grid; gap: 16px; }
  label { display: block; color: var(--text-3); font-size: 0.76rem; font-weight: 700; }
  input { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 12px 13px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: 0.88rem; box-shadow: var(--shadow-xs); transition: border-color 0.15s, box-shadow 0.15s; }
  input::placeholder { color: var(--muted-3); }
  input:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  button { margin-top: 4px; border: 1px solid var(--navy); border-radius: 8px; background: var(--navy); color: var(--paper); padding: 13px; font: inherit; font-size: 0.84rem; font-weight: 800; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.15s; }
  button:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); }
  button:disabled { opacity: 0.55; cursor: not-allowed; }
  .login-error { background: var(--red-bg-alt); border: 1px solid var(--red-border); border-radius: 8px; color: var(--red-dark); padding: 10px 12px; font-size: 0.78rem; font-weight: 600; }
  .login-footer { position: fixed; bottom: 22px; left: 0; right: 0; text-align: center; color: var(--muted-3); font-size: 0.68rem; }
</style>
