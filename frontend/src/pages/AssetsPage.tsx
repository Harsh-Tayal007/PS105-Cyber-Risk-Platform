import React, { useEffect, useState, useMemo } from 'react';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../lib/api/assets';
import { getVerifiedFindings } from '../lib/api/vulnerabilities';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import type { Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { InfoTip } from '../components/ui/InfoTip';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Tooltip } from '../components/ui/Tooltip';
import type { AssetResponse, AssetCreatePayload, AssetUpdatePayload, FindingResponse } from '@/types';
import { Plus, Search, Edit2, Trash2, Server } from 'lucide-react';
import { formatINR } from '../lib/format';

const CATEGORIES = [
  'All Categories',
  'Database Server',
  'Web Server',
  'Endpoint Fleet',
  'API Gateway',
  'Financial Switch',
  'Cloud Infrastructure',
];

const CRITICALITIES = ['All Criticalities', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [findings, setFindings] = useState<FindingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [criticalityFilter, setCriticalityFilter] = useState('All Criticalities');

  // Drawer state for asset details
  const [selectedAsset, setSelectedAsset] = useState<AssetResponse | null>(null);

  // Form Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<AssetResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('Database Server');
  const [businessValue, setBusinessValue] = useState('');
  const [cpeVendor, setCpeVendor] = useState('');
  const [cpeProduct, setCpeProduct] = useState('');
  const [installedVersion, setInstalledVersion] = useState('');
  const [criticality, setCriticality] = useState('HIGH');
  const [exposureLevel, setExposureLevel] = useState('1.0');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assetsData, findingsData] = await Promise.all([
        getAssets(),
        getVerifiedFindings().catch(() => []),
      ]);
      setAssets(assetsData);
      setFindings(findingsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch enterprise assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.cpe_product && a.cpe_product.toLowerCase().includes(q)) ||
        (a.cpe_vendor && a.cpe_vendor.toLowerCase().includes(q));

      const matchesCat =
        categoryFilter === 'All Categories' || a.asset_type === categoryFilter;

      const matchesCrit =
        criticalityFilter === 'All Criticalities' || a.criticality === criticalityFilter;

      return matchesSearch && matchesCat && matchesCrit;
    });
  }, [assets, searchQuery, categoryFilter, criticalityFilter]);

  // Metric aggregates
  const totalValue = useMemo(
    () => assets.reduce((sum, a) => sum + (a.business_value || 0), 0),
    [assets]
  );
  const criticalCount = useMemo(
    () => assets.filter((a) => a.criticality === 'CRITICAL').length,
    [assets]
  );
  const highCount = useMemo(
    () => assets.filter((a) => a.criticality === 'HIGH').length,
    [assets]
  );

  const openCreateModal = () => {
    setEditingAssetId(null);
    setName('');
    setAssetType('Database Server');
    setBusinessValue('');
    setCpeVendor('');
    setCpeProduct('');
    setInstalledVersion('');
    setCriticality('HIGH');
    setExposureLevel('1.0');
    setIsFormModalOpen(true);
  };

  const openEditModal = (asset: AssetResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAssetId(asset.asset_id);
    setName(asset.name);
    setAssetType(asset.asset_type);
    setBusinessValue(asset.business_value.toString());
    setCpeVendor(asset.cpe_vendor || '');
    setCpeProduct(asset.cpe_product || '');
    setInstalledVersion(asset.installed_version || '');
    setCriticality(asset.criticality);
    setExposureLevel(asset.exposure_level.toString());
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (asset: AssetResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget(asset);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const valNumber = parseFloat(businessValue) || 0;
      const expNumber = parseFloat(exposureLevel) || 1.0;

      if (editingAssetId) {
        const payload: AssetUpdatePayload = {
          name,
          asset_type: assetType,
          business_value: valNumber,
          cpe_vendor: cpeVendor || undefined,
          cpe_product: cpeProduct || undefined,
          installed_version: installedVersion || undefined,
          criticality,
          exposure_level: expNumber,
        };
        await updateAsset(editingAssetId, payload);
      } else {
        const payload: AssetCreatePayload = {
          name,
          asset_type: assetType,
          business_value: valNumber,
          cpe_vendor: cpeVendor || undefined,
          cpe_product: cpeProduct || undefined,
          installed_version: installedVersion || undefined,
          criticality,
          exposure_level: expNumber,
        };
        await createAsset(payload);
      }
      setIsFormModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(`Asset Save Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAsset(deleteTarget.asset_id);
      if (selectedAsset?.asset_id === deleteTarget.asset_id) {
        setSelectedAsset(null);
      }
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<AssetResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => (
        <div className="flex items-start gap-2.5">
          <Server className="w-4 h-4 text-brand mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium text-ink block truncate">{a.name}</span>
            <span className="text-[11px] text-muted block truncate">{a.asset_type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'business_value',
      header: 'Business Value',
      render: (a) => (
        <span className="num font-medium text-ink">
          {formatINR(a.business_value)}
        </span>
      ),
    },
    {
      key: 'software',
      header: 'Software',
      render: (a) => {
        const vendor = a.cpe_vendor || 'any';
        const product = a.cpe_product || 'any';
        const version = a.installed_version;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-ink">
              {vendor}:{product}
            </span>
            {version ? (
              <span className="text-[11px] text-muted">v{version}</span>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="warning" size="sm">
                  Version missing
                </Badge>
                <InfoTip content="No version = no vulnerability finding can be verified" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'criticality',
      header: 'Criticality',
      render: (a) => <RiskBadge severity={a.criticality} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24 text-right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Edit asset">
            <button
              type="button"
              aria-label={`Edit ${a.name}`}
              onClick={(e) => openEditModal(a, e)}
              className="p-1.5 rounded-[6px] text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete asset">
            <button
              type="button"
              aria-label={`Delete ${a.name}`}
              onClick={(e) => openDeleteModal(a, e)}
              className="p-1.5 rounded-[6px] text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <LoadingState
        message="Loading Asset Inventory..."
        subtitle="Fetching registered infrastructure and software metadata"
      />
    );
  }

  if (error) {
    return <ErrorState title="Assets API Error" errorDetails={error} onRetry={fetchData} />;
  }

  // Linked findings for the drawer asset
  const linkedFindings = selectedAsset
    ? findings.filter((f) => f.asset_id === selectedAsset.asset_id)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Workflow Page Header */}
      <PageHeader
        title="Asset Inventory"
        description="Register and classify enterprise digital systems to model threat exposure and financial loss."
        step={{ current: 1, total: 6 }}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Add Asset
          </Button>
        }
      />

      {/* Up to 4 StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Systems"
          value={assets.length}
          info="Total count of registered hardware, software, and cloud infrastructure systems."
        />
        <StatCard
          title="Total Valuation"
          value={formatINR(totalValue)}
          info="Aggregate financial replacement and business operational valuation."
        />
        <StatCard
          title="Critical Tier"
          value={criticalCount}
          tone={criticalCount > 0 ? 'danger' : 'default'}
          info="Assets categorized as mission-critical with maximum business impact."
        />
        <StatCard
          title="High Tier"
          value={highCount}
          tone={highCount > 0 ? 'warn' : 'default'}
          info="Tier-2 high-importance assets with significant financial sensitivity."
        />
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface border border-line rounded-[10px]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search assets by name or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {CRITICALITIES.map((crit) => (
              <option key={crit} value={crit}>
                {crit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      {assets.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-line rounded-[10px] space-y-3">
          <p className="text-xs text-muted">
            No assets registered yet. Add systems to begin vulnerability matching.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            Add First Asset
          </Button>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-ink">
              <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} scope="col" className={`px-4 py-3 font-medium text-xs text-muted ${col.className || ''}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted text-xs">
                      No assets matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr
                      key={asset.asset_id}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-surface-2/60 transition-colors duration-150 cursor-pointer"
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 text-xs sm:text-sm ${col.className || ''}`}>
                          {col.render ? col.render(asset) : (asset as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset ? selectedAsset.name : 'Asset Details'}
        subtitle={selectedAsset ? `Asset #${selectedAsset.asset_id} • ${selectedAsset.asset_type}` : undefined}
        footer={
          selectedAsset && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const target = selectedAsset;
                  setSelectedAsset(null);
                  setDeleteTarget(target);
                }}
              >
                Delete Asset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = selectedAsset;
                  setSelectedAsset(null);
                  openEditModal(target);
                }}
              >
                Edit Asset
              </Button>
            </div>
          )
        }
      >
        {selectedAsset && (
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="space-y-3 pb-5 border-b border-line">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Internal ID</span>
                <span className="font-mono text-xs text-ink">#{selectedAsset.asset_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Criticality</span>
                <RiskBadge severity={selectedAsset.criticality} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Business Valuation</span>
                <span className="num font-semibold text-ink">
                  {formatINR(selectedAsset.business_value)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Exposure Factor</span>
                <span className="font-mono text-xs text-ink">
                  {(selectedAsset.exposure_level * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Software Identity */}
            <div className="space-y-3 pb-5 border-b border-line">
              <h4 className="text-xs font-semibold text-muted font-sans">
                Software Identity
              </h4>
              <div className="p-3 bg-surface-2 rounded-[8px] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">CPE Vendor</span>
                  <span className="font-mono text-ink">{selectedAsset.cpe_vendor || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">CPE Product</span>
                  <span className="font-mono text-ink">{selectedAsset.cpe_product || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Installed Version</span>
                  {selectedAsset.installed_version ? (
                    <span className="font-mono text-ink">v{selectedAsset.installed_version}</span>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Missing
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Linked Findings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted font-sans">
                  Linked Findings
                </h4>
                <Badge variant={linkedFindings.length > 0 ? 'danger' : 'default'} size="sm">
                  {linkedFindings.length} Detected
                </Badge>
              </div>

              {linkedFindings.length === 0 ? (
                <p className="text-xs text-muted italic">
                  No verified vulnerability findings matched to this asset's software.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedFindings.map((f) => (
                    <div
                      key={f.finding_id}
                      className="p-3 rounded-[8px] bg-danger-soft/20 border border-danger/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="font-mono text-danger">#FIND-{f.finding_id}</span>
                        <Badge variant="danger" size="sm">
                          {f.confidence}
                        </Badge>
                      </div>
                      <p className="font-mono text-[11px] text-muted truncate">
                        {f.matched_cpe}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                        <span>Matched: v{f.matched_version}</span>
                        <span>{f.source_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create / Edit Asset Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingAssetId ? `Edit Asset #${editingAssetId}` : 'Register New Asset'}
        subtitle="Specify asset classification and software CPE details for automatic CVE detection"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAsset} className="space-y-6">
          {/* Section 1: Basics */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink font-serif pb-1 border-b border-line">
              1. Basics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Asset Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Payment Gateway"
                info="Descriptive enterprise identifier for this business or IT asset."
                required
              />
              <Select
                label="Asset Category"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                info="Architectural classification used in loss scenarios."
                options={CATEGORIES.filter((c) => c !== 'All Categories').map((c) => ({
                  label: c,
                  value: c,
                }))}
              />
            </div>
            <Select
              label="Criticality Rating"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              info="Business sensitivity tier (determines default qualitative threat severity)."
              options={[
                { label: 'CRITICAL', value: 'CRITICAL' },
                { label: 'HIGH', value: 'HIGH' },
                { label: 'MEDIUM', value: 'MEDIUM' },
                { label: 'LOW', value: 'LOW' },
              ]}
            />
          </div>

          {/* Section 2: Financial Value */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink font-serif pb-1 border-b border-line">
              2. Financial Value
            </h4>
            <div className="space-y-1.5">
              <Input
                label="Business Valuation (₹)"
                type="number"
                value={businessValue}
                onChange={(e) => setBusinessValue(e.target.value)}
                placeholder="e.g. 10000000"
                info="Direct replacement cost plus expected business interruption loss."
                required
                min="0"
              />
              <div className="text-xs text-muted flex items-center gap-1.5 px-1">
                <span>Formatted Preview:</span>
                <span className="num font-semibold text-brand">
                  {formatINR(parseFloat(businessValue) || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Software Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink font-serif pb-1 border-b border-line">
              3. Software Identity for Vulnerability Matching
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="CPE Vendor"
                value={cpeVendor}
                onChange={(e) => setCpeVendor(e.target.value)}
                placeholder="postgresql"
                info="Software publisher name according to NIST CPE naming standard."
              />
              <Input
                label="CPE Product"
                value={cpeProduct}
                onChange={(e) => setCpeProduct(e.target.value)}
                placeholder="postgresql"
                info="Software application name used in CVE applicability queries."
              />
              <Input
                label="Installed Version"
                value={installedVersion}
                onChange={(e) => setInstalledVersion(e.target.value)}
                placeholder="14.2"
                info="Exact version string required to match vulnerable NVD version ranges."
              />
            </div>
            <Input
              label="Exposure Factor (0.0 to 1.0)"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={exposureLevel}
              onChange={(e) => setExposureLevel(e.target.value)}
              info="Fraction of asset value exposed to immediate financial loss upon breach."
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              {editingAssetId ? 'Update Asset' : 'Save Asset'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Asset Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Are you sure you want to delete asset{' '}
            <strong className="text-ink font-medium">"{deleteTarget?.name}"</strong>? This will remove
            all associated threat mappings and risk models permanently.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={deleting}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
