<svelte:head><title>Review workspace · Faculty Reporting System</title></svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  type ReviewItem = { id: string; status: string; updated_at: string; faculty_name: string; period_label: string; completion: number };
  let loading = $state(true);
  let facultyCount = $state(0);
  let submittedCount = $state(0);
  let reviewNeeded = $state(0);
  let items: ReviewItem[] = $state([]);
  let error = $state('');
  onMount(async () => {
    try {
      const [reviewsRes, deptsRes] = await Promise.all([fetch('/api/reviews'), fetch('/api/departments')]);
      const reviews = await reviewsRes.json();
      const depts = await deptsRes.json();
      items = reviews.reports ?? [];
      reviewNeeded = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'CHANGES_REQUIRED').length;
      submittedCount = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length;
      const dept = (depts.departments ?? []).find((d: any) => d.code === 'CSE');
      facultyCount = dept?.member_count ?? 0;
    } catch { error = 'Unable to load department data.'; }
    finally { loading = false; }
  });
</script>
<main class="shell app-shell">{#if loading}<div class="loading-panel"><span class="spinner"></span><span>Loading department overview…</span></div>{:else if error}<div class="error-panel">{error}</div>{:else}<div class="breadcrumb">Administration <span>/</span> Department overview</div><div class="page-heading"><div><div class="eyebrow">Review workspace · CSE</div><h1>Department overview</h1><p>Keep the reporting cycle moving.</p></div><span class="period-chip">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span></div><section class="metrics"><div><small>Faculty</small><strong>{facultyCount}</strong><span>in department</span></div><div><small>Submitted</small><strong>{submittedCount}</strong><span>{facultyCount ? Math.round(submittedCount / facultyCount * 100) : 0}% submission rate</span></div><div><small>Review needed</small><strong>{reviewNeeded}</strong><span>awaiting your attention</span></div></section><section class="history"><div class="section-heading"><h2>Needs attention</h2><a href="/admin/reports">Open queue <span>→</span></a></div>{#if !items.length}<div class="empty-state">No reports requiring attention.</div>{:else}{#each items.slice(0, 5) as item}<div class="report-row"><span>{item.faculty_name}</span><span class="status {item.status === 'SUBMITTED' ? 'submitted' : item.status === 'CHANGES_REQUIRED' ? 'changes' : item.status === 'APPROVED' ? 'approved' : ''}">{item.status === 'CHANGES_REQUIRED' ? 'Changes required' : item.status[0] + item.status.slice(1).toLowerCase()}</span><span>Due {new Date(item.updated_at).toLocaleDateString()}</span><a href="/admin/reports">Review →</a></div>{/each}{/if}</section>{/if}</main>
<style>.loading-panel{display:flex;align-items:center;gap:12px;padding:24px;color:#71818a;font-size:.88rem}.spinner{width:18px;height:18px;border:2px solid #dbe3e7;border-top-color:#087f73;border-radius:50%;animation:spin .6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-panel{padding:16px 20px;background:#f9e9e7;color:#8f413b;border-radius:7px;margin-bottom:18px;font-size:.88rem}.breadcrumb{font-size:.73rem;color:#71818a;margin-bottom:8px}.breadcrumb span{padding:0 8px;color:#b2bdc1}.empty-state{padding:24px 0;color:#87969c;font-size:.82rem}</style>