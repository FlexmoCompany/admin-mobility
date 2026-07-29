import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  Search,
  Users,
  Wallet,
} from 'lucide-react';

import { getPartnerStats, listPartners } from '@/features/partners/api/list-partners';
import type { PartnerStatsResponse } from '@/features/partners/types';

const formatCurrency = (amount: number | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(new Date(value));

export function PartnersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const partnersQuery = useQuery({
    queryKey: ['partners', page, searchTerm],
    queryFn: () => listPartners({ page, searchTerm }),
  });

  const companies = partnersQuery.data?.companies ?? [];

  const statsQueries = useQueries({
    queries: companies.map((company) => ({
      queryKey: ['partners', company._id, 'stats'],
      queryFn: () => getPartnerStats(company._id),
      enabled: Boolean(company._id),
      staleTime: 60_000,
    })),
  });

  const statsByCompanyId = useMemo(() => {
    return companies.reduce<Record<string, PartnerStatsResponse | undefined>>(
      (accumulator, company, index) => {
        accumulator[company._id] = statsQueries[index]?.data;
        return accumulator;
      },
      {}
    );
  }, [companies, statsQueries]);

  const overview = useMemo(() => {
    const verified = companies.filter((company) => company.isVerified).length;
    const productionExposure = companies.reduce(
      (total, company) => total + (company.productionBalance ?? 0),
      0
    );
    const activeMembers = companies.reduce((total, company) => {
      const stats = statsByCompanyId[company._id]?.data;
      return total + (stats?.members.active ?? 0);
    }, 0);
    const activeModules = companies.reduce((total, company) => {
      const stats = statsByCompanyId[company._id]?.data;
      return total + (stats?.modules.active ?? 0);
    }, 0);

    return {
      verified,
      productionExposure,
      activeMembers,
      activeModules,
    };
  }, [companies, statsByCompanyId]);

  const watchlist = useMemo(() => {
    return companies
      .map((company) => {
        const stats = statsByCompanyId[company._id]?.data;

        return {
          company,
          stats,
          riskScore:
            (company.status === 'inactive' ? 3 : 0) +
            (company.isVerified ? 0 : 2) +
            ((stats?.members.inactive ?? 0) > 0 ? 1 : 0),
        };
      })
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, 4);
  }, [companies, statsByCompanyId]);

  return (
    <section className="section-view partners-page">
      <header className="section-header">
        <p className="section-eyebrow">Partenaires flotte</p>
        <div className="hero-panel partners-hero">
          <div className="hero-copy-block">
            <span className="hero-tag">Network overview</span>
            <h2>Partenaires connectes au reseau Fuel Ops</h2>
            <p className="section-description">
              Vue de supervision multi-partenaires pensee comme un ecran d exploitation:
              exposition financiere, densite utile, lecture rapide des statuts et acces
              aux signaux de risque.
            </p>
          </div>

          <div className="hero-metrics-grid">
            <article className="hero-metric-tile">
              <span className="tile-icon">
                <Building2 size={16} />
              </span>
              <strong>{partnersQuery.data?.total ?? 0}</strong>
              <span>partenaires traces</span>
            </article>
            <article className="hero-metric-tile">
              <span className="tile-icon">
                <BadgeCheck size={16} />
              </span>
              <strong>{overview.verified}</strong>
              <span>verifies</span>
            </article>
            <article className="hero-metric-tile">
              <span className="tile-icon">
                <Users size={16} />
              </span>
              <strong>{overview.activeMembers}</strong>
              <span>membres actifs</span>
            </article>
            <article className="hero-metric-tile">
              <span className="tile-icon">
                <Wallet size={16} />
              </span>
              <strong>{formatCurrency(overview.productionExposure)}</strong>
              <span>exposition production</span>
            </article>
          </div>
        </div>
      </header>

      {partnersQuery.isLoading ? (
        <div className="empty-state">
          <h3>Chargement des partenaires</h3>
          <p>On interroge `tiers-service` pour remonter la premiere vue connectee.</p>
        </div>
      ) : null}

      {partnersQuery.isError ? (
        <div className="empty-state error">
          <h3>Connexion backend a completer</h3>
          <p>
            La page appelle bien l endpoint admin, mais la session interne n est pas
            encore en place. Verifiez `VITE_API_GATEWAY_URL`, `VITE_BACKOFFICE_ENV`
            et le token admin stocke en local.
          </p>
        </div>
      ) : null}

      {!partnersQuery.isLoading && !partnersQuery.isError ? (
        <>
          <div className="partners-layout">
            <section className="ops-table-card partners-table-card">
              <div className="ops-table-header">
                <div>
                  <p className="ops-table-kicker">Registry</p>
                  <h3>Base partenaires</h3>
                </div>

                <div className="toolbar-inline">
                  <label className="search-field compact">
                    <Search size={16} />
                    <input
                      value={searchTerm}
                      onChange={(event) => {
                        setPage(1);
                        setSearchTerm(event.target.value);
                      }}
                      placeholder="Nom, email, telephone, reference"
                      type="search"
                    />
                  </label>
                  <span className="status-chip subtle">
                    <Activity size={14} />
                    Source: tiers-service
                  </span>
                </div>
              </div>

              <div className="ops-table dense">
                <div className="ops-table-row ops-table-row-head partners-table-head">
                  <span>Partenaire</span>
                  <span>Statut</span>
                  <span>Membres</span>
                  <span>Modules</span>
                  <span>Solde prod</span>
                  <span>Creation</span>
                </div>

                {companies.map((company) => {
                  const stats = statsByCompanyId[company._id]?.data;

                  return (
                    <div key={company._id} className="ops-table-row partners-table-row">
                      <span className="partner-cell">
                        <strong>{company.companyInfos?.name ?? 'Partenaire sans nom'}</strong>
                        <small>
                          {company.reference} - {company.companyInfos?.email ?? 'email indisponible'}
                        </small>
                      </span>
                      <span>
                        <span className={`status-pill status-${company.status}`}>
                          {company.status}
                        </span>
                      </span>
                      <span>{stats?.members.total ?? company.companyMembers?.length ?? 0}</span>
                      <span>{stats?.modules.active ?? 0} actifs</span>
                      <span>{formatCurrency(company.productionBalance)}</span>
                      <span>{formatDate(company.createdAt)}</span>
                    </div>
                  );
                })}
              </div>

              {companies.length === 0 ? (
                <div className="empty-state">
                  <h3>Aucun partenaire trouve</h3>
                  <p>Affinez la recherche ou verifiez les donnees disponibles cote admin.</p>
                </div>
              ) : null}

              <div className="pagination-row">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!partnersQuery.data?.prevPage}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                >
                  Page precedente
                </button>

                <span>
                  Page {partnersQuery.data?.page ?? page} / {partnersQuery.data?.totalPages ?? 1}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={!partnersQuery.data?.nextPage}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                >
                  Page suivante
                </button>
              </div>
            </section>

            <aside className="partners-rail">
              <section className="rail-card">
                <div className="rail-card-header">
                  <div>
                    <p className="ops-table-kicker">Watchlist</p>
                    <h3>Partenaires a surveiller</h3>
                  </div>
                  <CircleAlert size={16} />
                </div>

                <div className="watchlist-stack">
                  {watchlist.map(({ company, stats, riskScore }) => (
                    <article key={company._id} className="watchlist-item">
                      <div>
                        <strong>{company.companyInfos?.name ?? company.reference}</strong>
                        <p>
                          {company.status} - {stats?.members.inactive ?? 0} membres inactifs
                        </p>
                      </div>
                      <span className="risk-pill">Risque {riskScore}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rail-card">
                <div className="rail-card-header">
                  <div>
                    <p className="ops-table-kicker">Actions</p>
                    <h3>Suite prevue</h3>
                  </div>
                  <ArrowRight size={16} />
                </div>

                <ul className="queue-list compact">
                  <li>Fiche 360 partenaire</li>
                  <li>Filtres statut et verification</li>
                  <li>Consolidation finance multi-services</li>
                </ul>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}
