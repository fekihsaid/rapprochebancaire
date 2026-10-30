import * as React from 'react';
import { Action, Role, Statut, TypeRapprochement } from '../../../../rapprochements/workflow/models';
import { appliquerTransition } from '../../../../rapprochements/workflow/workflow';
import styles from './CreateRapprochementForm.module.scss';
import { GENRE_CHOICES, MONTH_CHOICES, YEAR_CHOICES } from './services/configuration';
import type { IRapprochementService } from './services/IRapprochementService';
import type {
  IChoiceMatrixEntry,
  PoleKey,
  RapprochementPeriod
} from './services/models';
import { toServiceUpdate } from './workflowAdapter';

interface ICreateRapprochementFormProps {
  pole: PoleKey;
  period: Exclude<RapprochementPeriod, 'archivage'>;
  currentUserId?: number;
  dataService: IRapprochementService;
  onCancel: () => void;
  onCreated: (message: string) => void;
}

type SubmitMode = 'draft' | 'submit';

export const CreateRapprochementForm: React.FC<ICreateRapprochementFormProps> = ({
  pole,
  period,
  currentUserId,
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
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [submitMode, setSubmitMode] = React.useState<SubmitMode>('draft');
  const fileInput = React.useRef<HTMLInputElement>(null);

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

  const setSelectedFiles = (selectedFiles: File[]): void => {
    const oversizedFile = selectedFiles.find(file => file.size > 50 * 1024 * 1024);
    if (oversizedFile) {
      setFiles([]);
      setErrorMessage(`Le fichier « ${oversizedFile.name} » dépasse la limite de 50 Mo.`);
      if (fileInput.current) {
        fileInput.current.value = '';
      }
      return;
    }

    setFiles(selectedFiles.slice(0, 1));
    setErrorMessage('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSelectedFiles(Array.from(event.currentTarget.files || []));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFiles(Array.from(event.dataTransfer.files));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    if (files.length === 0) {
      setErrorMessage('Veuillez ajouter au moins une pièce jointe.');
      return;
    }

    setIsSaving(true);
    const title = [company, year, month, account].filter(Boolean).join(' - ');
    const shouldSubmit = submitMode === 'submit';
    const itemId = await dataService.createRapprochement(pole, {
      title,
      month,
      year,
      account,
      company,
      genre,
      status: 'Brouillon',
      period,
      description
    }).catch(error => {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setIsSaving(false);
      return undefined;
    });

    if (itemId === undefined) {
      return;
    }

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

    if (shouldSubmit && attachmentErrors.length === 0) {
      try {
        const transition = appliquerTransition(
          {
            statut: Statut.Brouillon,
            type: period === 'mensuel' ? TypeRapprochement.Mensuel : TypeRapprochement.Trimestriel,
            secondePasse: false
          },
          Action.Soumettre,
          {
            roles: [Role.Emetteur],
            date: new Date().toISOString(),
            ...(currentUserId === undefined ? {} : { utilisateurId: currentUserId })
          }
        );
        await dataService.updateRapprochement(pole, itemId, toServiceUpdate(transition, false));
      } catch (error) {
        setErrorMessage(
          `Le rapprochement a été créé et ses pièces jointes ajoutées, mais la soumission a échoué : ${error instanceof Error ? error.message : String(error)}`
        );
        setIsSaving(false);
        return;
      }
    }

    if (attachmentErrors.length > 0) {
      onCreated(
        `Le rapprochement a été créé en brouillon, mais certaines pièces jointes n'ont pas pu être ajoutées : ${attachmentErrors.join('; ')}`
      );
      return;
    }

    onCreated(shouldSubmit
      ? 'Le rapprochement a été soumis à la validation.'
      : 'Le rapprochement a été enregistré en tant que brouillon.');
  };

  if (isLoadingChoices) {
    return <p className={styles.loading}>Chargement des choix…</p>;
  }

  return (
    <section className={styles.formPage} aria-labelledby="createRapprochementTitle">
      <h2 className={styles.title} id="createRapprochementTitle">Créer un rapprochement bancaire</h2>
      <form onSubmit={event => handleSubmit(event)}>
        <div className={styles.fields}>
          <label className={styles.field} htmlFor="rapprochement-genre">
            <span>Genre <b>*</b></span>
            <select
              id="rapprochement-genre"
              required
              value={genre}
              onChange={event => {
                setGenre(event.currentTarget.value);
                setCompany('');
                setAccount('');
              }}
              disabled={isSaving}
            >
              <option value="" />
              {GENRE_CHOICES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={styles.field} htmlFor="rapprochement-company">
            <span>Société <b>*</b></span>
            <select
              id="rapprochement-company"
              required
              value={company}
              onChange={event => {
                setCompany(event.currentTarget.value);
                setAccount('');
              }}
              disabled={!genre || isSaving}
            >
              <option value="" />
              {companies.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={styles.field} htmlFor="rapprochement-account">
            <span>Compte</span>
            <select
              id="rapprochement-account"
              value={account}
              onChange={event => setAccount(event.currentTarget.value)}
              disabled={!company || isSaving}
            >
              <option value="" />
              {accounts.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={styles.field} htmlFor="rapprochement-year">
            <span>Année</span>
            <select
              id="rapprochement-year"
              value={year}
              onChange={event => setYear(event.currentTarget.value)}
              disabled={isSaving}
            >
              <option value="" />
              {YEAR_CHOICES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={styles.field} htmlFor="rapprochement-month">
            <span>Mois</span>
            <select
              id="rapprochement-month"
              value={month}
              onChange={event => setMonth(event.currentTarget.value)}
              disabled={isSaving}
            >
              <option value="" />
              {MONTH_CHOICES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={`${styles.field} ${styles.descriptionField}`} htmlFor="rapprochement-description">
            <span>Description</span>
            <textarea
              id="rapprochement-description"
              value={description}
              onChange={event => setDescription(event.currentTarget.value)}
              rows={5}
              disabled={isSaving}
            />
          </label>
          <div className={`${styles.field} ${styles.attachmentField}`}>
            <span>Pièce(s) jointe(s) <b>*</b></span>
            <div className={styles.attachmentControl}>
              <input
                ref={fileInput}
                className={styles.fileInput}
                type="file"
                onChange={handleFileChange}
                disabled={isSaving}
                aria-label="Sélectionner une pièce jointe"
              />
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (fileInput.current) {
                    fileInput.current.click();
                  }
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (fileInput.current) {
                      fileInput.current.click();
                    }
                  }
                }}
                onDragOver={event => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                aria-label="Cliquez ou glissez un fichier ici"
              >
                <span className={styles.paperclip} aria-hidden="true">📎</span>
                <span>Cliquez ou glissez un fichier ici</span>
              </div>
              <span className={styles.fileNames}>
                {files.length ? files.map(file => file.name).join(', ') : 'Aucun document attaché'}
              </span>
            </div>
          </div>
        </div>
        {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={isSaving}>Retour</button>
          <button
            type="submit"
            disabled={isSaving}
            onClick={() => setSubmitMode('draft')}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer en tant que brouillon'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            onClick={() => setSubmitMode('submit')}
          >
            {isSaving ? 'Enregistrement…' : 'Soumettre à la validation'}
          </button>
        </div>
      </form>
    </section>
  );
};
