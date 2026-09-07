<script lang="ts">
  import Bell from '@lucide/svelte/icons/bell';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import {
    fetchNotifications,
    fmtDate,
    getNotifications,
    getNotifCount,
    markAllRead,
    notifLabel,
    notifPill,
    toggleRead,
  } from '$lib/stores/notifications.svelte';
import { NOTIFICATION_POLL_MS } from '$lib/constants';

  let showNotifications = $state(false);
  let showCount = $state(6);
  const notifications = $derived(getNotifications());
  const notifCount = $derived(getNotifCount());
  const visible = $derived(notifications.slice(0, showCount));
  const hasMore = $derived(showCount < notifications.length);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  function closeNotifs(e: MouseEvent) {
    const target = e.target;
    if (target instanceof HTMLElement && !target.closest('.notif-root')) showNotifications = false;
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') fetchNotifications();
  }

  onMount(async () => {
    await fetchNotifications();
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, NOTIFICATION_POLL_MS);
    if (browser) {
      document.addEventListener('click', closeNotifs);
      document.addEventListener('visibilitychange', handleVisibility);
    }
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (browser) {
      document.removeEventListener('click', closeNotifs);
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  });

</script>

<div class="notif-root">
  <button class="notif-btn" onclick={() => (showNotifications = !showNotifications)} aria-label="Notifications" aria-expanded={showNotifications}>
    <Bell size={19} />
    {#if notifCount > 0}<span class="notif-badge">{notifCount}</span>{/if}
  </button>
  {#if showNotifications}
    <div class="notif-popover">
      <div class="notif-head">
        <strong>Notifications</strong>
        <button class="notif-markall" onclick={markAllRead}>Mark all as read</button>
      </div>
      <div class="notif-scroll">
        {#if visible.length}
          {#each visible as n}
            <div class="notif-row" class:unread={!n.is_read}>
              <div class="notif-body">
                <strong class:unread={!n.is_read}>{n.action === 'REPORT_SUBMITTED' ? `${n.actor_name ?? 'A faculty member'} submitted a report` : notifLabel(n.action)}</strong>
                <div class="notif-meta">
                  <span class="notif-tag {notifPill(n.action)}">{notifLabel(n.action)}</span>
                  <span class="notif-time">{fmtDate(n.created_at)}</span>
                </div>
              </div>
              <button class="notif-hover-act" onclick={() => toggleRead(n)}>
                {n.is_read ? 'Mark unread' : 'Mark read'}
              </button>
            </div>
          {/each}
          {#if hasMore}
            <button class="notif-more" onclick={() => { showCount += 6; }}>Load more ({notifications.length - showCount} remaining)</button>
          {/if}
        {:else}
          <div class="notif-empty">You're all caught up.</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notif-root {
    position: relative;
    flex: none;
  }
  .notif-btn {
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    position: relative;
    padding: 8px;
    display: grid;
    place-items: center;
    color: var(--muted-2);
    border-radius: 8px;
    transition: color 0.14s ease, background 0.14s ease, border-color 0.14s ease;
  }
  .notif-btn:hover {
    color: var(--navy);
    background: var(--bg-hover);
    border-color: var(--line);
  }
  .notif-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    background: var(--red);
    color: #fff;
    font-size: 0.58rem;
    font-weight: 800;
    min-width: 15px;
    height: 15px;
    border-radius: 99px;
    display: grid;
    place-items: center;
    padding: 0 3px;
    line-height: 1;
    border: 2px solid #fff;
  }
  .notif-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    width: 380px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    color: var(--navy);
    z-index: 120;
    overflow: hidden;
  }
  .notif-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent);
  }
  .notif-head strong { font-size: 0.84rem; font-weight: 750; color: var(--text-1); }
  .notif-markall {
    border: 0;
    background: transparent;
    color: var(--blue);
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 0;
  }
  .notif-markall:hover { text-decoration: underline; }
  .notif-scroll {
    max-height: 420px;
    overflow-y: auto;
  }
  .notif-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line-2);
    border-left: 3px solid transparent;
    transition: background 0.1s;
  }
  .notif-row:hover { background: #f6f9fc; }
  .notif-row.unread { background: #eff4fb; border-left-color: var(--accent); }
  .notif-body { min-width: 0; flex: 1; }
  .notif-body strong {
    display: block;
    font-size: 0.76rem;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .notif-body strong.unread { font-weight: 800; }
  .notif-body strong:not(.unread) {
    font-weight: 500;
    color: var(--muted);
  }
  .notif-meta { display: flex; align-items: center; gap: 8px; }
  .notif-tag {
    flex: none;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 3px 7px;
    border-radius: 999px;
    letter-spacing: 0.03em;
    border: 1px solid transparent;
  }
  .pill-sub { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .pill-ok { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .pill-chg { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .notif-time { color: var(--muted-2); font-size: 0.65rem; }
  .notif-hover-act {
    flex: none;
    border: 1px solid transparent;
    background: transparent;
    color: var(--accent);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    cursor: pointer;
    padding: 5px 8px;
    border-radius: 6px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.1s, background 0.1s, border-color 0.1s;
  }
  .notif-row:hover .notif-hover-act, .notif-hover-act:focus-visible { opacity: 1; }
  .notif-hover-act:hover { background: var(--bg-hover); border-color: var(--line); }
  .notif-more {
    width: 100%;
    border: 0;
    background: transparent;
    padding: 10px 16px;
    font: inherit;
    font-size: 0.72rem;
    color: var(--blue);
    font-weight: 700;
    cursor: pointer;
    border-bottom: 1px solid var(--line-2);
    transition: background 0.1s;
  }
  .notif-more:hover { background: var(--bg-hover); }
  .notif-empty {
    padding: 24px 16px;
    color: var(--muted-3);
    font-size: 0.78rem;
    text-align: center;
  }
</style>
