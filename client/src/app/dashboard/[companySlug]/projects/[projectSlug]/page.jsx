'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProjectSkeleton } from '@/components/Skeleton';
import Alert from '@/components/Alert';
import { useProject } from '@/hooks/useProject';
import EnvironmentSection from '@/components/Project/EnvironmentSection';
import VariableSection from '@/components/Project/VariableSection';
import ShareModal from '@/components/Project/ShareModal';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import { getProjectSteps } from '@/lib/tourSteps';

export default function ProjectDetailPage() {
  // Use slugs from the URL
  const { companySlug, projectSlug } = useParams();

  const {
    project,
    companyName,
    environments,
    activeEnvId,
    activeEnv,
    variables,
    loading,
    varsLoading,
    error,
    notice,
    setError,
    setNotice,
    varSearch,
    varFilter,
    varPage,
    setVarPage,
    varTotalPages,
    varPageSafe,
    paginatedVariables,
    filteredVariables,
    handleVarSearchChange,
    handleVarFilterChange,
    handleSwitchEnv,
    addEnvOpen,
    setAddEnvOpen,
    newEnvName,
    setNewEnvName,
    addEnvSubmitting,
    handleAddEnvironment,
    addVarOpen,
    setAddVarOpen,
    newKey,
    setNewKey,
    newValue,
    setNewValue,
    showNewValue,
    setShowNewValue,
    newIsSecret,
    setNewIsSecret,
    addVarSubmitting,
    addVarError,
    setAddVarError,
    handleAddVariable,
    importOpen,
    setImportOpen,
    importText,
    setImportText,
    importIsSecret,
    setImportIsSecret,
    importSubmitting,
    importError,
    setImportError,
    handleImport,
    handleFileSelect,
    deletingVar,
    setDeletingVar,
    deleteSubmitting,
    handleConfirmDelete,
    revealed,
    copiedId,
    toggleReveal,
    handleCopy,
    handleCopyAll,
    handleDownloadEnv,
    handleDownloadCsv,
    shareExpiryOpen,
    setShareExpiryOpen,
    shareExpiryMinutes,
    setShareExpiryMinutes,
    customExpiryValue,
    setCustomExpiryValue,
    customExpiryUnit,
    setCustomExpiryUnit,
    isCustomExpiry,
    setIsCustomExpiry,
    generatingLink,
    shareError,
    setShareError,
    shareLink,
    showShareModal,
    setShowShareModal,
    shareCopied,
    shareStep,
    setShareStep,
    shareAll,
    setShareAll,
    selectedKeys,
    setSelectedKeys,
    handleGenerateLink,
    copyShareLink,
  } = useProject(companySlug, projectSlug);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <ProjectSkeleton />
      </div>
    );
  }

  const hasVariables = variables.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Back link uses the company slug */}
      <Link href={`/dashboard/${companySlug}`} className="text-sm text-mist hover:text-paper">
        &larr; {companyName || 'Back to company'}
      </Link>

      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-signal">Project</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
  <h1 data-tour="proj-heading" className="text-2xl font-semibold text-paper">{project?.name}</h1>
  <Link
    data-tour="proj-compare-link"
    href={`/dashboard/${companySlug}/projects/${projectSlug}/compare`}
    className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
  >
    Compare environments
  </Link>
</div>

      <EnvironmentSection
        environments={environments}
        activeEnvId={activeEnvId}
        onSwitchEnv={handleSwitchEnv}
        addEnvOpen={addEnvOpen}
        setAddEnvOpen={setAddEnvOpen}
        newEnvName={newEnvName}
        setNewEnvName={setNewEnvName}
        addEnvSubmitting={addEnvSubmitting}
        handleAddEnvironment={handleAddEnvironment}
        error={error}
        setError={setError}
      />

      {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      {notice && <Alert variant="success" className="mt-4">{notice}</Alert>}

      <VariableSection
        variables={variables}
        varsLoading={varsLoading}
        filteredVariables={filteredVariables}
        paginatedVariables={paginatedVariables}
        varPageSafe={varPageSafe}
        varTotalPages={varTotalPages}
        onVarPageChange={setVarPage}
        varSearch={varSearch}
        onVarSearchChange={handleVarSearchChange}
        varFilter={varFilter}
        onVarFilterChange={handleVarFilterChange}
        onCopyAll={handleCopyAll}
        onDownloadEnv={handleDownloadEnv}
        onDownloadCsv={handleDownloadCsv}
        onGenerateLink={() => {
          setShareError('');
          setShareExpiryMinutes(60);
          setIsCustomExpiry(false);
          setCustomExpiryValue(1);
          setCustomExpiryUnit('hours');
          setShareStep(1);
          setShareAll(true);
          setSelectedKeys([]);
          setShareExpiryOpen(true);
        }}
        hasVariables={hasVariables}
        addVarOpen={addVarOpen}
        setAddVarOpen={setAddVarOpen}
        addVarError={addVarError}
        setAddVarError={setAddVarError}
        newKey={newKey}
        setNewKey={setNewKey}
        newValue={newValue}
        setNewValue={setNewValue}
        showNewValue={showNewValue}
        setShowNewValue={setShowNewValue}
        newIsSecret={newIsSecret}
        setNewIsSecret={setNewIsSecret}
        addVarSubmitting={addVarSubmitting}
        handleAddVariable={handleAddVariable}
        importOpen={importOpen}
        setImportOpen={setImportOpen}
        importError={importError}
        setImportError={setImportError}
        importText={importText}
        setImportText={setImportText}
        importIsSecret={importIsSecret}
        setImportIsSecret={setImportIsSecret}
        importSubmitting={importSubmitting}
        handleImport={handleImport}
        handleFileSelect={handleFileSelect}
        deletingVar={deletingVar}
        setDeletingVar={setDeletingVar}
        deleteSubmitting={deleteSubmitting}
        handleConfirmDelete={handleConfirmDelete}
        revealed={revealed}
        copiedId={copiedId}
        toggleReveal={toggleReveal}
        handleCopy={handleCopy}
      />

      <ShareModal
        open={shareExpiryOpen}
        onClose={() => setShareExpiryOpen(false)}
        step={shareStep}
        setStep={setShareStep}
        shareAll={shareAll}
        setShareAll={setShareAll}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        variables={variables}
        expiryMinutes={shareExpiryMinutes}
        setExpiryMinutes={setShareExpiryMinutes}
        isCustomExpiry={isCustomExpiry}
        setIsCustomExpiry={setIsCustomExpiry}
        customExpiryValue={customExpiryValue}
        setCustomExpiryValue={setCustomExpiryValue}
        customExpiryUnit={customExpiryUnit}
        setCustomExpiryUnit={setCustomExpiryUnit}
        generatingLink={generatingLink}
        shareError={shareError}
        setShareError={setShareError}
        handleGenerateLink={handleGenerateLink}
        showResult={showShareModal}
        setShowResult={setShowShareModal}
        shareLink={shareLink}
        shareCopied={shareCopied}
        copyShareLink={copyShareLink}
      />
      {!loading && !varsLoading && (
        <OnboardingTour tourKey="project" steps={getProjectSteps(hasVariables)} />
      )}
    </div>
  );
}