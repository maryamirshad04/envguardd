import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { parseEnvText, toEnvFormat, toCsvFormat, downloadText } from '@/lib/projectUtils';

const VARS_PAGE_SIZE = 10;

export function useProject(companyId, projectId) {
  const router = useRouter();

  // Core data
  const [project, setProject] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [activeEnvId, setActiveEnvId] = useState(null);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [varsLoading, setVarsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Search/filter/pagination
  const [varSearch, setVarSearch] = useState('');
  const [varFilter, setVarFilter] = useState('all');
  const [varPage, setVarPage] = useState(1);

  // Modal states
  const [addEnvOpen, setAddEnvOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [addEnvSubmitting, setAddEnvSubmitting] = useState(false);

  const [addVarOpen, setAddVarOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNewValue, setShowNewValue] = useState(false);
  const [newIsSecret, setNewIsSecret] = useState(true);
  const [addVarSubmitting, setAddVarSubmitting] = useState(false);
  const [addVarError, setAddVarError] = useState('');

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importIsSecret, setImportIsSecret] = useState(true);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState('');

  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const [deletingVar, setDeletingVar] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Share states
  const [shareExpiryOpen, setShareExpiryOpen] = useState(false);
  const [shareExpiryMinutes, setShareExpiryMinutes] = useState(60);
  const [customExpiryValue, setCustomExpiryValue] = useState(1);
  const [customExpiryUnit, setCustomExpiryUnit] = useState('hours');
  const [isCustomExpiry, setIsCustomExpiry] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareStep, setShareStep] = useState(1);
  const [shareAll, setShareAll] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  // Load variables
  const loadVariables = useCallback(
    async (envId) => {
      if (!envId) return;
      setVarsLoading(true);
      try {
        const res = await api.companies.projects.listVariables(companyId, projectId, envId);
        setVariables(res.variables || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setVarsLoading(false);
      }
    },
    [companyId, projectId]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [projectRes, companyRes] = await Promise.all([
          api.companies.projects.get(companyId, projectId),
          api.companies.get(companyId),
        ]);
        if (cancelled) return;
        setProject(projectRes.project);
        setCompanyName(companyRes.company?.name || '');
        setEnvironments(projectRes.environments || []);
        const first = projectRes.environments?.[0];
        if (first) {
          setActiveEnvId(first.id);
          await loadVariables(first.id);
        }
      } catch (err) {
        router.push(err.message?.toLowerCase().includes('not found') ? `/dashboard/${companyId}` : '/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [companyId, projectId, router, loadVariables]);

  // Filtered and paginated variables
  const filteredVariables = useMemo(() => {
    let list = variables;
    if (varFilter === 'protected') list = list.filter((v) => v.is_secret !== false);
    if (varFilter === 'plain') list = list.filter((v) => v.is_secret === false);
    const q = varSearch.trim().toLowerCase();
    if (q) list = list.filter((v) => v.key.toLowerCase().includes(q));
    return list;
  }, [variables, varFilter, varSearch]);

  const varTotalPages = Math.max(1, Math.ceil(filteredVariables.length / VARS_PAGE_SIZE));
  const varPageSafe = Math.min(varPage, varTotalPages);
  const paginatedVariables = filteredVariables.slice(
    (varPageSafe - 1) * VARS_PAGE_SIZE,
    varPageSafe * VARS_PAGE_SIZE
  );

  // Handlers
  function handleVarSearchChange(value) {
    setVarSearch(value);
    setVarPage(1);
  }

  function handleVarFilterChange(value) {
    setVarFilter(value);
    setVarPage(1);
  }

  async function handleSwitchEnv(envId) {
    setActiveEnvId(envId);
    setRevealed({});
    setError('');
    setVarSearch('');
    setVarFilter('all');
    setVarPage(1);
    await loadVariables(envId);
  }

  async function handleAddEnvironment(e) {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    setError('');
    setAddEnvSubmitting(true);
    try {
      const { environment } = await api.companies.projects.createEnvironment(
        companyId,
        projectId,
        newEnvName.trim()
      );
      setEnvironments((prev) => [...prev, environment]);
      setNewEnvName('');
      setAddEnvOpen(false);
      await handleSwitchEnv(environment.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddEnvSubmitting(false);
    }
  }

  async function handleAddVariable(e) {
    e.preventDefault();
    const trimmedKey = newKey.trim();
    if (!trimmedKey && !newValue) {
      setAddVarError('Both key and value are required.');
      return;
    }
    if (!trimmedKey) {
      setAddVarError('Key is required.');
      return;
    }
    if (!newValue) {
      setAddVarError('Value is required.');
      return;
    }
    if (variables.some((v) => v.key === trimmedKey)) {
      setAddVarError(
        `"${trimmedKey}" already exists in ${activeEnv?.name || 'this environment'}. Delete it first.`
      );
      return;
    }
    setAddVarError('');
    setAddVarSubmitting(true);
    try {
      const { variable } = await api.companies.projects.upsertVariable(
        companyId,
        projectId,
        activeEnvId,
        trimmedKey,
        newValue,
        newIsSecret
      );
      setVariables((prev) => [...prev, variable].sort((a, b) => a.key.localeCompare(b.key)));
      setNewKey('');
      setNewValue('');
      setShowNewValue(false);
      setNewIsSecret(true);
      setAddVarOpen(false);
    } catch (err) {
      setAddVarError(err.message);
    } finally {
      setAddVarSubmitting(false);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    const parsed = parseEnvText(importText).map((v) => ({ ...v, is_secret: importIsSecret }));
    if (parsed.length === 0) {
      setImportError('No KEY=VALUE lines found to import');
      return;
    }
    const keys = parsed.map((v) => v.key);
    const duplicatesWithin = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicatesWithin.length > 0) {
      setImportError(`Duplicate keys found in import: ${[...new Set(duplicatesWithin)].join(', ')}`);
      return;
    }
    const existingKeys = new Set(variables.map((v) => v.key));
    const duplicatesWithExisting = parsed.filter((v) => existingKeys.has(v.key));
    if (duplicatesWithExisting.length > 0) {
      setImportError('Duplicate keys already exist. Delete them first.');
      return;
    }
    setImportError('');
    setImportSubmitting(true);
    try {
      const res = await api.companies.projects.importVariables(companyId, projectId, activeEnvId, parsed);
      const imported = res.variables || [];
      setVariables((prev) => {
        const importedKeys = new Set(imported.map((v) => v.key));
        const kept = prev.filter((v) => !importedKeys.has(v.key));
        return [...kept, ...imported].sort((a, b) => a.key.localeCompare(b.key));
      });
      setNotice(`Imported ${imported.length} variable${imported.length === 1 ? '' : 's'}`);
      setTimeout(() => setNotice(''), 3000);
      setImportText('');
      setImportIsSecret(true);
      setImportOpen(false);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportSubmitting(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ''));
    reader.readAsText(file);
  }

  async function handleConfirmDelete() {
    setDeleteSubmitting(true);
    try {
      await api.companies.projects.deleteVariable(companyId, projectId, activeEnvId, deletingVar.id);
      setVariables((prev) => prev.filter((v) => v.id !== deletingVar.id));
      setDeletingVar(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function toggleReveal(varId) {
    setRevealed((prev) => ({ ...prev, [varId]: !prev[varId] }));
  }

  async function handleCopy(varId, value) {
    await navigator.clipboard.writeText(value);
    setCopiedId(varId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(toEnvFormat(filteredVariables));
    setNotice('Copied all as .env format');
    setTimeout(() => setNotice(''), 2000);
  }

  function handleDownloadEnv() {
    downloadText(`${activeEnv?.name || 'env'}.env`, toEnvFormat(filteredVariables));
  }

  function handleDownloadCsv() {
    downloadText(`${activeEnv?.name || 'env'}.csv`, toCsvFormat(filteredVariables));
  }

  async function handleGenerateLink(e) {
    e.preventDefault();
    let minutes = shareExpiryMinutes;
    if (isCustomExpiry) {
      const val = parseFloat(customExpiryValue);
      if (isNaN(val) || val <= 0) {
        setShareError('Please enter a positive number.');
        return;
      }
      let computedMinutes;
      switch (customExpiryUnit) {
        case 'minutes': computedMinutes = val; break;
        case 'hours': computedMinutes = val * 60; break;
        case 'days': computedMinutes = val * 1440; break;
        default: computedMinutes = val;
      }
      minutes = Math.round(computedMinutes);
      if (minutes < 5) {
        setShareError('Minimum expiry is 5 minutes.');
        return;
      }
      if (minutes > 10080) {
        setShareError('Maximum expiry is 7 days.');
        return;
      }
    }
    setShareError('');
    setGeneratingLink(true);
    try {
      const variableKeys = shareAll ? null : selectedKeys;
      const res = await api.share.create(companyId, projectId, activeEnvId, minutes, variableKeys);
      setShareLink(res.url);
      setShareExpiryOpen(false);
      setShareCopied(false);
      setShowShareModal(true);
    } catch (err) {
      setShareError(err.message);
    } finally {
      setGeneratingLink(false);
    }
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  return {
    // Data
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

    // Search/filter/pagination
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

    // Environment
    handleSwitchEnv,
    addEnvOpen,
    setAddEnvOpen,
    newEnvName,
    setNewEnvName,
    addEnvSubmitting,
    handleAddEnvironment,

    // Add variable
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

    // Import
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

    // Delete
    deletingVar,
    setDeletingVar,
    deleteSubmitting,
    handleConfirmDelete,

    // Copy/Reveal
    revealed,
    copiedId,
    toggleReveal,
    handleCopy,
    handleCopyAll,
    handleDownloadEnv,
    handleDownloadCsv,

    // Share
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
  };
}