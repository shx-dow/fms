import { a6 as head, e as escape_html, ab as bind_props } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let form = $$props["form"];
    head("1x05zx6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sign in · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="simple-login svelte-1x05zx6"><section class="login-card svelte-1x05zx6"><div class="simple-brand svelte-1x05zx6"><span class="crest svelte-1x05zx6">U</span><div><strong class="svelte-1x05zx6">University</strong><small class="svelte-1x05zx6">Faculty Reporting System</small></div></div> <h1 class="svelte-1x05zx6">Sign in</h1> <form method="POST" class="svelte-1x05zx6"><label for="email" class="svelte-1x05zx6">Email address<input id="email" name="email" type="email" autocomplete="username" required="" placeholder="name@university.edu" class="svelte-1x05zx6"/></label> <label for="password" class="svelte-1x05zx6">Password<input id="password" name="password" type="password" autocomplete="current-password" required="" class="svelte-1x05zx6"/></label> `);
    if (form?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="error svelte-1x05zx6" role="alert">${escape_html(form.error)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit" class="svelte-1x05zx6">Sign in</button></form> <p class="support svelte-1x05zx6">For access assistance, contact your department administrator.</p></section> <footer class="svelte-1x05zx6">Internal university application · Academic year 2026–27</footer></main>`);
    bind_props($$props, { form });
  });
}
export {
  _page as default
};
