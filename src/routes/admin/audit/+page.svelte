<script lang="ts">
  import { onMount } from 'svelte';
  let events: { action: string; entity_type: string; entity_id: string; created_at: string; actor_name?: string }[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  onMount(async () => {
    try { const response = await fetch('/api/audit'); const data = await response.json(); events = data.events ?? []; }
    catch { error = 'Unable to load audit history.'; }
    finally { loading = false; }
  });
  const actionLabel = (a: string) => ({ REPORT_SAVED: 'Draft saved', REPORT_SUBMITTED: 'Submitted for review', REPORT_REOPENED: 'Reopened for editing', APPROVED: 'Approved', CHANGES_REQUIRED: 'Changes requested', PERIOD_UPDATED: 'Period updated', DEPARTMENT_UPDATED: 'Department updated', USER_CREATED: 'User created', USER_UPDATED: 'User updated', USER_ACTIVATED: 'User activated', USER_DEACTIVATED: 'User deactivated' }[a] ?? a.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()));
  const entityLabel = (t: string) => ({ REPORT: 'Weekly report', USER: 'User account', DEPARTMENT: 'Department', REPORTING_PERIOD: 'Reporting period' }[t] ?? t);
  function timeAgo(dateStr: string) {
    const ms = Date.now() - new Date(dateStr).getTime();
    if (ms < 60000) return 'Just now';
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    if (ms < 604800000) return `${Math.floor(ms / 86400000)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
</script>
<svelte:head><title>Audit history · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell"><div class="breadcrumb">Administration <span>/</span> Audit history</div><div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Audit history</h1><p>Important report and authorization actions recorded by the system.</p></div><span class="period-chip">{events.length} event{events.length === 1 ? '' : 's'}</span></div>{#if loading}<div class="loading-panel"><span class="spinner"></span><span>Loading audit history…</span></div>{:else if error}<div class="error-panel">{error}</div>{:else}<section class="audit-panel"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>{#if !events.length}<tr><td colspan="4" class="empty-row">No audit events have been recorded.</td></tr>{/if}{#each events as event}<tr><td class="time-cell"><span class="time-ago">{timeAgo(event.created_at)}</span><span class="time-full">{new Date(event.created_at).toLocaleString()}</span></td><td><strong>{event.actor_name ?? 'System'}</strong></td><td><span class="audit-action {event.action === 'APPROVED' ? 'act-approve' : event.action === 'CHANGES_REQUIRED' ? 'act-changes' : event.action === 'REPORT_SUBMITTED' ? 'act-submit' : ''}">{actionLabel(event.action)}</span></td><td><span class="entity-type">{entityLabel(event.entity_type)}</span></td></tr>{/each}</tbody></table></section>{/if}</main>
<style>.loading-panel{display:flex;align-items:center;gap:12px;padding:24px;color:#71818a;font-size:.88rem}.spinner{width:18px;height:18px;border:2px solid #dbe3e7;border-top-color:#087f73;border-radius:50%;animation:spin .6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-panel{padding:16px 20px;background:#f9e9e7;color:#8f413b;border-radius:7px;margin-bottom:18px;font-size:.88rem}.breadcrumb{font-size:.73rem;color:#71818a;margin-bottom:8px}.breadcrumb span{padding:0 8px;color:#b2bdc1}.audit-panel{background:#fdfcf9;border:1px solid #dbe3e7;border-radius:7px;overflow:auto}.audit-panel table{width:100%;border-collapse:collapse;font-size:.76rem;min-width:560px}.audit-panel th,.audit-panel td{text-align:left;padding:12px 16px;border-bottom:1px solid #e6ecee}.audit-panel th{text-transform:uppercase;letter-spacing:.08em;color:#87969c;font-size:.63rem;font-weight:800}.audit-panel td{color:#61727d}.audit-panel td strong{color:#1b2b36;font-size:.74rem;font-weight:600}.time-cell{display:flex;flex-direction:column;gap:2px}.time-ago{font-weight:700;color:#1b2b36;font-size:.7rem}.time-full{color:#87969c;font-size:.65rem}.audit-action{display:inline-block;font-weight:800;font-size:.65rem;padding:3px 7px;border-radius:3px}.act-approve{background:#e4f3ef;color:#167166}.act-changes{background:#f7ead2;color:#97651b}.act-submit{background:#e6f0f4;color:#3a7083}.entity-type{color:#61727d;font-size:.72rem}.empty-row{text-align:center;padding:24px;color:#87969c;font-size:.8rem}</style>