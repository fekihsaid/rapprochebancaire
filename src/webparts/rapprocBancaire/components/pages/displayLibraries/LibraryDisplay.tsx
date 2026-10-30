import * as React from 'react';
import styles from './LibraryDisplay.module.scss';
import { HorizontalNavBar } from './HorizontalNavBar';
import { CreateRapprochementForm } from './CreateRapprochementForm';
import type { IRapprochementService } from './services/IRapprochementService';
import type { PoleKey, RapprochementPeriod } from './services/models';

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

  React.useEffect(() => {
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
  }, [dataService, pole, selectedPeriod, refreshVersion]);

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
      <HorizontalNavBar selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      {selectedPeriod !== 'archivage' && (
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
      <div className={styles.tableContainer}>
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
              <tr key={item.id}>
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
      </div>
      {isCreateFormOpen && selectedPeriod !== 'archivage' && (
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
