'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProjectSkeleton } from '@/components/Skeleton';
import Alert from '@/components/Alert';
import { useCompare } from '@/hooks/useCompare';
import CompareToolbar from '@/components/Compare/CompareToolbar';
import CompareList from '@/components/Compare/CompareList';
import SyncConfirmModal from '@/components/Compare/SyncConfirmModal';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import { getCompareSteps } from '@/lib/tourSteps';

export default function CompareEnvironmentsPage() {
  const { companySlug, projectSlug } = useParams();
  const c = useCompare(companySlug, projectSlug);

  if (c.loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <ProjectSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href={`/dashboard/${companySlug}/projects/${projectSlug}`} className="text-sm text-mist hover:text-paper">
        &larr; {c.project?.name || 'Back to project'}
      </Link>

      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-signal">Compare</p>
      <h1 data-tour="cmp-heading" className="mt-2 text-2xl font-semibold text-paper">Compare environments</h1>
      <p className="mt-1 text-md text-mist">
        See what differs between two environments, then copy selected variables across.
      </p>

      {c.error && <Alert variant="error" className="mt-4">{c.error}</Alert>}
      {c.syncNotice && <Alert variant="success" className="mt-4">{c.syncNotice}</Alert>}

      {c.environments.length < 2 ? (
        <div className="mt-6 rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">Add at least one more environment to compare.</p>
        </div>
      ) : (
        <>
          <CompareToolbar
            environments={c.environments}
            sourceEnvId={c.sourceEnvId}
            setSourceEnvId={c.setSourceEnvId}
            targetEnvId={c.targetEnvId}
            setTargetEnvId={c.setTargetEnvId}
            onSwap={c.swapEnvs}
            summary={c.summary}
            searchInput={c.searchInput}
            setSearchInput={c.setSearchInput}
            statusFilter={c.statusFilter}
            onStatusFilterChange={c.handleStatusFilterChange}
            selectedCount={c.selectedKeys.size}
            onOpenSync={c.openSyncModal}
          />

          <CompareList
            rows={c.rows}
            fetching={c.fetching}
            total={c.total}
            totalPages={c.totalPages}
            page={c.page}
            onPageChange={c.setPage}
            selectedKeys={c.selectedKeys}
            onToggleKey={c.toggleSelectKey}
            onToggleAll={c.toggleSelectAllOnPage}
            syncableRows={c.syncableRows}
            revealedValues={c.revealedValues}
            revealing={c.revealing}
            revealError={c.revealError}
            onReveal={c.revealValue}
          />

          <SyncConfirmModal
            open={c.syncModalOpen}
            onClose={() => c.setSyncModalOpen(false)}
            selectedRows={c.selectedRowsPreview}
            sourceEnvName={c.environments.find((e) => e.id === c.sourceEnvId)?.name}
            targetEnvName={c.environments.find((e) => e.id === c.targetEnvId)?.name}
            submitting={c.syncSubmitting}
            error={c.syncError}
            onConfirm={c.confirmSync}
          />
        {!c.loading && c.summary && (
            <OnboardingTour tourKey="compare" steps={getCompareSteps()} />
          )}
        </>
      )}
    </div>
  );
}