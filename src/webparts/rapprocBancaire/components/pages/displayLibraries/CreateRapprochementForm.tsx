import * as React from 'react';
import styles from './CreateRapprochementForm.module.scss';
import { GENRE_CHOICES, YEAR_CHOICES } from './services/configuration';
import type { IRapprochementService } from './services/IRapprochementService';
import type {
  IChoiceMatrixEntry,
  PoleKey,
  RapprochementPeriod
} from './services/models';

interface ICreateRapprochementFormProps {
  pole: PoleKey;
  period: Exclude<RapprochementPeriod, 'archivage'>;
  dataService: IRapprochementService;
  onCancel: () => void;
  onCreated: (message: string) => void;
}

export const CreateRapprochementForm: React.FC<ICreateRapprochementFormProps> = ({
  pole,
  period,
  dataService,
  onCancel,
  onCreated
}) => {
  const [choices, setChoices] = React.useState<IChoiceMatrixEntry[]>([]);
  const [genre, setGenre] = React.useState<string>('');
  const [company, setCompany] = React.useState<string>('');
  const [account, setAccount] = React.useState<string>('');
  const [year, setYear] = React.useState<string>('');
  const [month, setMonth] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [isLoadingChoices, setIsLoadingChoices] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    let isCurrentRequest = true;
    dataService.getChoiceMatrix(pole).then(
      items => {
        if (isCurrentRequest) {
          setChoices(items);
          setIsLoadingChoices(false);
        }
      },
      error => {
        if (isCurrentRequest) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setIsLoadingChoices(false);
        }
      }
    );

    return () => {
      isCurrentRequest = false;
    };
  }, [dataService, pole]);

  const companies = Array.from(new Set(
    choices.filter(choice => choice.genre === genre).map(choice => choice.company)
  ));
  const accounts = Array.from(new Set(
    choices
      .filter(choice => choice.genre === genre && choice.company === company)
      .map(choice => choice.account)
  ));

  const handleGenreChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setGenre(event.currentTarget.value);
    setCompany('');
    setAccount('');
  };

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setCompany(event.currentTarget.value);
    setAccount('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFiles = Array.from(event.currentTarget.files || []);
    const oversizedFile = selectedFiles.find(file => file.size > 50 * 1024 * 1024);
    if (oversizedFile) {
      setFiles([]);
      setErrorMessage(`Le fichier « ${oversizedFile.name} » dépasse la limite de 50 Mo.`);
      event.currentTarget.value = '';
      return;
    }

    setFiles(selectedFiles);
    setErrorMessage('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    const title = `${company} - ${year} - ${month} - ${account}`;
    dataService.createRapprochement(pole, {
      title,
      month,
      year,
      account,
      company,
      genre,
      status: 'Brouillon',
      period,
      description
    }).then(async itemId => {
      const attachmentErrors: string[] = [];
      for (const file of files) {
        try {
          await dataService.addAttachment(pole, itemId, file);
        } catch (error) {
          attachmentErrors.push(
            `${file.name} : ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (attachmentErrors.length > 0) {
        onCreated(`Le rapprochement a été créé, mais certaines pièces jointes n'ont pas pu être ajoutées : ${attachmentErrors.join('; ')}`);
      } else {
        onCreated('Le rapprochement a été créé.');
      }
    }).catch(error => {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setIsSaving(false);
    });
  };

  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="createRapprochementTitle"
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title} id="createRapprochementTitle">Créer un rapprochement bancaire</h2>
            <p className={styles.subtitle}>Nouveau rapprochement {period === 'mensuel' ? 'mensuel' : 'trimestriel'}</p>
          </div>
          <span className={styles.status}>Brouillon</span>
        </header>
        {isLoadingChoices ? (
          <p>Chargement des choix…</p>
        ) : errorMessage ? (
          <>
            <p className={styles.error} role="alert">{errorMessage}</p>
            <div className={styles.actions}>
              <button type="button" onClick={onCancel}>Fermer</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Genre *</span>
                <select required value={genre} onChange={handleGenreChange} disabled={isSaving}>
                  <option value="">Sélectionner un genre</option>
                  {GENRE_CHOICES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Société *</span>
                <select required value={company} onChange={handleCompanyChange} disabled={!genre || isSaving}>
                  <option value="">Sélectionner une société</option>
                  {companies.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Compte</span>
                <select value={account} onChange={event => setAccount(event.currentTarget.value)} disabled={!company || isSaving}>
                  <option value="">Sélectionner un compte</option>
                  {accounts.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Année</span>
                <select required value={year} onChange={event => setYear(event.currentTarget.value)} disabled={isSaving}>
                  <option value="">Sélectionner une année</option>
                  {YEAR_CHOICES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Mois</span>
                <input
                  required
                  type="text"
                  value={month}
                  onChange={event => setMonth(event.currentTarget.value)}
                  placeholder="Ex. Septembre"
                  disabled={isSaving}
                />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={event => setDescription(event.currentTarget.value)}
                  rows={3}
                  disabled={isSaving}
                />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Pièce(s) jointe(s)</span>
                <span className={styles.fieldHint}>Taille maximale : 50 Mo par fichier.</span>
                <input type="file" multiple onChange={handleFileChange} disabled={isSaving} />
              </label>
            </div>
            {files.length > 0 && (
              <ul className={styles.fileList}>
                {files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}
              </ul>
            )}
            {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
            <div className={styles.actions}>
              <button type="button" onClick={onCancel} disabled={isSaving}>Annuler</button>
              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer comme brouillon'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
