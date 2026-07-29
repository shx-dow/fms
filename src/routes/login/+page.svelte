<script lang="ts">
  let { form }: { form: { error?: string } | undefined } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Sign in · Faculty Reporting System</title></svelte:head>

<main class="simple-login">
  <section class="login-card">
    <div class="simple-brand">
      <span class="crest">I</span>
      <div><strong>The ICFAI University, Jaipur</strong><small>Faculty Reporting</small></div>
    </div>
    <div class="eyebrow">Internal university workspace</div>
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
          autofocus
        /></label
      >
      <label for="password"
        >Password<input id="password" name="password" type="password" autocomplete="current-password" required /></label
      >
      {#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p class="support">For access assistance, contact your department administrator.</p>
  </section>
  <footer>Internal university application · Academic year 2026–27</footer>
</main>

<style>
  :global(body) {
    background: #f4f6f5;
    color: #17252d;
  }
  .simple-login {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .login-card {
    width: 100%;
    max-width: 390px;
  }
  .simple-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 48px;
  }
  .simple-brand strong,
  .simple-brand small {
    display: block;
  }
  .simple-brand strong {
    font-size: 0.86rem;
  }
  .simple-brand small {
    color: #64747a;
    font-size: 0.7rem;
    margin-top: 2px;
  }
  .crest {
    width: 31px;
    height: 31px;
    border: 1px solid #7d9ba5;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #145b78;
    font-weight: 800;
  }
  .eyebrow {
    color: #145b78;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    font-size: 0.66rem;
    font-weight: 800;
  }
  .login-card h1 {
    font-size: 1.9rem;
    letter-spacing: -0.04em;
    margin: 9px 0 6px;
  }
  .login-card form {
    display: grid;
    gap: 17px;
  }
  .login-card label {
    display: block;
    color: #3b525c;
    font-size: 0.75rem;
    font-weight: 750;
  }
  .login-card input {
    display: block;
    width: 100%;
    margin-top: 7px;
    padding: 11px;
    border: 1px solid #c8d5d7;
    border-radius: 6px;
    background: #fff;
    color: #17252d;
    font: inherit;
    font-size: 0.86rem;
  }
  .login-card input:focus {
    outline: 3px solid #d4eaf0;
    border-color: #145b78;
  }
  .login-card button {
    margin-top: 3px;
    border: 0;
    border-radius: 6px;
    background: #17252d;
    color: #f4f6f5;
    padding: 12px;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
  }
  .login-card button:hover {
    background: #294a5a;
  }
  .login-card button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .error {
    background: #f8e8e5;
    border: 1px solid #edc9c4;
    border-radius: 6px;
    color: #a84f42;
    padding: 9px 10px;
    font-size: 0.75rem;
  }
  .support {
    color: #87969c;
    font-size: 0.72rem;
    line-height: 1.5;
    margin: 22px 0 0;
  }
  .simple-login footer {
    position: fixed;
    bottom: 22px;
    color: #87969c;
    font-size: 0.68rem;
  }
  @media (max-width: 500px) {
    .simple-login {
      align-items: start;
      padding-top: 70px;
    }
    .simple-brand {
      margin-bottom: 58px;
    }
    .simple-login footer {
      position: static;
      margin-top: 45px;
      text-align: center;
    }
  }
</style>
