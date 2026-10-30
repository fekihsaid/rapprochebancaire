import * as React from 'react';
import styles from './LibraryDisplay.module.scss';
import { HorizontalNavBar } from './HorizontalNavBar';
import { CreateRapprochementForm } from './CreateRapprochementForm';
import { RapprochementDetail } from './RapprochementDetail';
import type { IRapprochementService } from './services/IRapprochementService';
import type { IRapprochement, IUserAccess, PoleKey, RapprochementPeriod } from './services/models';

interface ILibraryDisplayProps {
  pole: PoleKey;
  poleName: string;
  siteAbsoluteUrl: string;
  dataService: IRapprochementService;
  onBack: () => void;
}

const columns = [
  { key: 'title', label: 'Titre' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'account', label: 'Compte' },
  { key: 'company', label: 'Société' },
  { key: 'genre', label: 'Genre' },
  { key: 'status', label: 'Statut' },
  { key: 'signer1', label: 'Nom du signataire 1' },
  { key: 'signer2', label: 'Nom du signataire 2' }
] as const;

export const LibraryDisplay: React.FC<ILibraryDisplayProps> = ({
  pole,
  poleName,
  siteAbsoluteUrl,
  dataService,
  onBack
}) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<RapprochementPeriod>('trimestriel');
  const [rows, setRows] = React.useState<Awaited<ReturnType<IRapprochementService['getRapprochements']>>>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isCreateFormOpen, setIsCreateFormOpen] = React.useState<boolean>(false);
  const [refreshVersion, setRefreshVersion] = React.useState<number>(0);
  const [notice, setNotice] = React.useState<string>('');
  const [userAccess, setUserAccess] = React.useState<IUserAccess | undefined>(undefined);
  const [isLoadingAccess, setIsLoadingAccess] = React.useState<boolean>(true);
  const [accessError, setAccessError] = React.useState<string>('');
  const [selectedItem, setSelectedItem] = React.useState<IRapprochement | undefined>();

  React.useEffect(() => {
    let isCurrentRequest = true;
    setIsLoadingAccess(true);
    setAccessError('');
    setUserAccess(undefined);

    dataService.getUserAccess(pole).then(
      access => {
        if (isCurrentRequest) {
          setUserAccess(access);
          setIsLoadingAccess(false);
        }
      },
      error => {
        if (isCurrentRequest) {
          setAccessError(error instanceof Error ? error.message : String(error));
          setIsLoadingAccess(false);
        }
      }
    );

    return () => {
      isCurrentRequest = false;
    };
  }, [dataService, pole]);

  React.useEffect(() => {
    if (!userAccess || !userAccess.canView) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    let isCurrentRequest = true;
    setIsLoading(true);
    setErrorMessage('');

    dataService.getRapprochements(pole, selectedPeriod).then(
      items => {
        if (isCurrentRequest) {
          setRows(items);
          setIsLoading(false);
        }
      },
      error => {
        if (isCurrentRequest) {
          setRows([]);
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setIsLoading(false);
        }
      }
    );

    return () => {
      isCurrentRequest = false;
    };
  }, [dataService, pole, selectedPeriod, refreshVersion, userAccess]);

  return (
    <section className={styles.libraryPage}>
      <div
        className={styles.banner}
        style={{ backgroundImage: `url(${siteAbsoluteUrl}/SiteAssets/UsefullLinks/Bannier.png)` }}
        aria-hidden="true"
      />
      <button className={styles.backButton} type="button" onClick={onBack}>
        Liste des pôles
      </button>
      <h1 className={styles.title}>PÔLE {poleName}</h1>
      <HorizontalNavBar
        selectedPeriod={selectedPeriod}
        onPeriodChange={period => {
          setSelectedItem(undefined);
          setSelectedPeriod(period);
        }}
      />
      {userAccess && userAccess.canCreate && selectedPeriod !== 'archivage' && (
        <div className={styles.toolbar}>
          <button className={styles.createButton} type="button" onClick={() => {
            setNotice('');
            setIsCreateFormOpen(true);
          }}>
            Créer un rapprochement bancaire
          </button>
        </div>
      )}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {isLoadingAccess ? (
        <p className={styles.emptyState}>Vérification des accès…</p>
      ) : accessError ? (
        <p className={styles.errorState} role="alert">{accessError}</p>
      ) : !userAccess || !userAccess.canView ? (
        <p className={styles.errorState} role="alert">
          Vous n’avez pas accès aux listes de ce pôle.
        </p>
      ) : selectedItem && userAccess ? (
        <RapprochementDetail
          item={selectedItem}
          pole={pole}
          dataService={dataService}
          userAccess={userAccess}
          onClose={() => setSelectedItem(undefined)}
          onUpdated={() => {
            setSelectedItem(undefined);
            setNotice('Le rapprochement a été mis à jour.');
            setRefreshVersion(version => version + 1);
          }}
        />
      ) : <div className={styles.tableContainer}>
        <table className={styles.listTable}>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.key} scope="col">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className={styles.emptyState} colSpan={columns.length}>Chargement des rapprochements…</td></tr>
            ) : errorMessage ? (
              <tr><td className={styles.errorState} colSpan={columns.length}>{errorMessage}</td></tr>
            ) : rows.length > 0 ? rows.map(item => (
              <tr
                key={item.id}
                className={styles.clickableRow}
                tabIndex={0}
                role="button"
                aria-label={`Ouvrir le rapprochement ${item.title}`}
                onClick={() => setSelectedItem(item)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedItem(item);
                  }
                }}
              >
                {columns.map(column => (
                  <td key={column.key}>{item[column.key]}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className={styles.emptyState} colSpan={columns.length}>
                  Aucun rapprochement dans cet onglet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
      {isCreateFormOpen && userAccess && userAccess.canCreate && selectedPeriod !== 'archivage' && (
        <CreateRapprochementForm
          pole={pole}
          period={selectedPeriod}
          dataService={dataService}
          onCancel={() => setIsCreateFormOpen(false)}
          onCreated={message => {
            setIsCreateFormOpen(false);
            setNotice(message);
            setRefreshVersion(version => version + 1);
          }}
        />
      )}
    </section>
  );
};
