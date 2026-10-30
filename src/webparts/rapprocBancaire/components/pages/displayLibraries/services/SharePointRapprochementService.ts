import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { POLES, SHAREPOINT_FIELDS, SHAREPOINT_LISTS } from './configuration';
import type { IRapprochementService } from './IRapprochementService';
import type {
  IChoiceMatrixEntry,
  INewRapprochement,
  IRapprochement,
  IRapprochementUpdate,
  PoleKey,
  RapprochementPeriod
} from './models';

interface ISharePointItem {
  Id: number;
  Title?: string;
  Mois?: string;
  Annee?: string;
  Compte?: string;
  Societe?: string;
  Genre?: string;
  Statut?: string;
  TypeParRap?: string;
  DescriptionParRap?: string;
  Signataire1Name?: { Title?: string } | string;
  Signataire2Name?: { Title?: string } | string;
  [fieldName: string]: unknown;
}

interface ISharePointCollection<T> {
  value?: T[];
  '@odata.nextLink'?: string;
  d?: {
    results?: T[];
    __next?: string;
  };
}

interface ISharePointItemResponse {
  d?: {
    Id?: number;
  };
  Id?: number;
}

interface ISharePointListResponse {
  d?: {
    ListItemEntityTypeFullName?: string;
  };
}

interface ISharePointError {
  error?: {
    message?: {
      value?: string;
    };
  };
  'odata.error'?: {
    message?: {
      value?: string;
    };
  };
}

export class SharePointRapprochementService implements IRapprochementService {
  public constructor(
    private readonly _httpClient: SPHttpClient,
    private readonly _rootSiteAbsoluteUrl: string
  ) { }

  public async getRapprochements(pole: PoleKey, period: RapprochementPeriod): Promise<IRapprochement[]> {
    const listName = period === 'archivage' ? SHAREPOINT_LISTS.archives : SHAREPOINT_LISTS.rapprochements;
    const select = [
      'Id',
      'Title',
      SHAREPOINT_FIELDS.month,
      SHAREPOINT_FIELDS.year,
      SHAREPOINT_FIELDS.account,
      SHAREPOINT_FIELDS.company,
      SHAREPOINT_FIELDS.genre,
      SHAREPOINT_FIELDS.status,
      `${SHAREPOINT_FIELDS.signer1}/Title`,
      `${SHAREPOINT_FIELDS.signer2}/Title`,
      SHAREPOINT_FIELDS.period,
      SHAREPOINT_FIELDS.description
    ].join(',');
    const expand = `${SHAREPOINT_FIELDS.signer1},${SHAREPOINT_FIELDS.signer2}`;
    const filter = period === 'archivage'
      ? undefined
      : `${SHAREPOINT_FIELDS.period} eq '${period === 'mensuel' ? 'Mensuel' : 'Trimestriel'}'`;
    const query = [
      `$select=${encodeURIComponent(select)}`,
      `$expand=${encodeURIComponent(expand)}`,
      filter ? `$filter=${encodeURIComponent(filter)}` : undefined
    ].filter(Boolean).join('&');
    const items = await this._getItems<ISharePointItem>(pole, listName, query);

    return items.map(item => ({
      id: item.Id,
      title: item.Title || '',
      month: item[SHAREPOINT_FIELDS.month] || '',
      year: item[SHAREPOINT_FIELDS.year] || '',
      account: item[SHAREPOINT_FIELDS.account] || '',
      company: item[SHAREPOINT_FIELDS.company] || '',
      genre: item[SHAREPOINT_FIELDS.genre] || '',
      status: item[SHAREPOINT_FIELDS.status] || '',
      signer1: this._getPersonName(item[SHAREPOINT_FIELDS.signer1]),
      signer2: this._getPersonName(item[SHAREPOINT_FIELDS.signer2]),
      period,
      description: item[SHAREPOINT_FIELDS.description] || ''
    }));
  }

  public async getChoiceMatrix(pole: PoleKey): Promise<IChoiceMatrixEntry[]> {
    const query = `$select=${encodeURIComponent([
      SHAREPOINT_FIELDS.genre,
      SHAREPOINT_FIELDS.company,
      SHAREPOINT_FIELDS.account
    ].join(','))}`;
    const items = await this._getItems<ISharePointItem>(pole, SHAREPOINT_LISTS.choiceMatrix, query);

    return items.map(item => ({
      genre: item[SHAREPOINT_FIELDS.genre] || '',
      company: item[SHAREPOINT_FIELDS.company] || '',
      account: item[SHAREPOINT_FIELDS.account] || ''
    }));
  }

  public async createRapprochement(pole: PoleKey, item: INewRapprochement): Promise<number> {
    const listName = SHAREPOINT_LISTS.rapprochements;
    const listUrl = this._getListUrl(pole, listName);
    const entityType = await this._getListItemEntityType(listUrl, listName);
    const payload = this._createPayload(entityType, item);

    const response = await this._httpClient.post(
      `${listUrl}/items`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose'
        },
        body: JSON.stringify(payload)
      }
    );
    const result = await this._readJson<ISharePointItemResponse>(response);
    const id = result.d && result.d.Id ? result.d.Id : result.Id;
    if (!id) {
      throw new Error('SharePoint a créé l’élément sans retourner son identifiant.');
    }
    return id;
  }

  public async updateRapprochement(
    pole: PoleKey,
    itemId: number,
    changes: IRapprochementUpdate
  ): Promise<void> {
    const listUrl = this._getListUrl(pole, SHAREPOINT_LISTS.rapprochements);
    const entityType = await this._getListItemEntityType(listUrl, SHAREPOINT_LISTS.rapprochements);
    const payload = this._createPayload(entityType, changes);
    const response = await this._httpClient.post(
      `${listUrl}/items(${itemId})`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: JSON.stringify(payload)
      }
    );
    await this._ensureSuccess(response);
  }

  public async addAttachment(pole: PoleKey, itemId: number, file: File): Promise<void> {
    if (file.size === 0) {
      throw new Error('Le fichier joint est vide.');
    }

    const webUrl = this._getWebUrl(pole);
    const fileName = encodeURIComponent(file.name.replace(/'/g, "''"));
    const attachmentUrl = `${webUrl}/_api/web/lists/GetByTitle('${SHAREPOINT_LISTS.rapprochements}')/items(${itemId})/AttachmentFiles/add(FileName='${fileName}')`;
    const body = await this._readFile(file);
    const response = await this._httpClient.post(
      encodeURI(attachmentUrl),
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/octet-stream'
        },
        body
      }
    );
    await this._ensureSuccess(response);
  }

  private async _getItems<T>(pole: PoleKey, listName: string, query: string): Promise<T[]> {
    const results: T[] = [];
    let url = `${this._getListUrl(pole, listName)}/items?${query}`;

    while (url) {
      const response = await this._httpClient.get(
        encodeURI(url),
        SPHttpClient.configurations.v1,
        { headers: { Accept: 'application/json;odata=nometadata' } }
      );
      const body = await this._readJson<ISharePointCollection<T>>(response);
      const pageItems = body.value || (body.d && body.d.results) || [];
      results.push(...pageItems);
      url = (body['@odata.nextLink'] || (body.d && body.d.__next) || '').replace(/&amp;/g, '&');
    }

    return results;
  }

  private async _readJson<T>(response: SPHttpClientResponse): Promise<T> {
    await this._ensureSuccess(response);
    return response.json() as Promise<T>;
  }

  private async _ensureSuccess(response: SPHttpClientResponse): Promise<void> {
    if (response.ok) {
      return;
    }

    let details = '';
    try {
      const body = await response.json() as ISharePointError;
      details = body.error && body.error.message && body.error.message.value
        ? body.error.message.value
        : body['odata.error'] && body['odata.error'].message
          ? body['odata.error'].message.value || ''
          : '';
    } catch (error) {
      details = error instanceof Error ? error.message : String(error);
    }

    throw new Error(`Erreur SharePoint HTTP ${response.status}${details ? ` : ${details}` : ''}.`);
  }

  private _getListUrl(pole: PoleKey, listName: string): string {
    const escapedListName = listName.replace(/'/g, "''");
    return `${this._getWebUrl(pole)}/_api/web/lists/GetByTitle('${escapedListName}')`;
  }

  private async _getListItemEntityType(listUrl: string, listName: string): Promise<string> {
    const response = await this._httpClient.get(
      `${listUrl}?$select=ListItemEntityTypeFullName`,
      SPHttpClient.configurations.v1,
      { headers: { Accept: 'application/json;odata=verbose' } }
    );
    const result = await this._readJson<ISharePointListResponse>(response);
    const entityType = result.d && result.d.ListItemEntityTypeFullName;
    if (!entityType) {
      throw new Error(`SharePoint n'a pas retourné le type d'élément de la liste « ${listName} ».`);
    }
    return entityType;
  }

  private _createPayload(
    entityType: string,
    item: INewRapprochement | IRapprochementUpdate
  ): { __metadata: { type: string }; [key: string]: string | number | { type: string } } {
    const payload: { __metadata: { type: string }; [key: string]: string | number | { type: string } } = {
      __metadata: { type: entityType }
    };

    if (item.title !== undefined) { payload[SHAREPOINT_FIELDS.title] = item.title; }
    if (item.month !== undefined) { payload[SHAREPOINT_FIELDS.month] = item.month; }
    if (item.year !== undefined) { payload[SHAREPOINT_FIELDS.year] = item.year; }
    if (item.account !== undefined) { payload[SHAREPOINT_FIELDS.account] = item.account; }
    if (item.company !== undefined) { payload[SHAREPOINT_FIELDS.company] = item.company; }
    if (item.genre !== undefined) { payload[SHAREPOINT_FIELDS.genre] = item.genre; }
    if (item.status !== undefined) { payload[SHAREPOINT_FIELDS.status] = item.status; }
    if (item.period !== undefined) {
      payload[SHAREPOINT_FIELDS.period] = item.period === 'mensuel' ? 'Mensuel' : 'Trimestriel';
    }
    if (item.description !== undefined) { payload[SHAREPOINT_FIELDS.description] = item.description; }
    if (item.signer1Id !== undefined) { payload[`${SHAREPOINT_FIELDS.signer1}Id`] = item.signer1Id; }
    if (item.signer2Id !== undefined) { payload[`${SHAREPOINT_FIELDS.signer2}Id`] = item.signer2Id; }
    return payload;
  }

  private _getWebUrl(pole: PoleKey): string {
    const webPath = POLES[pole].webPath;
    return `${this._rootSiteAbsoluteUrl.replace(/\/$/, '')}/${encodeURIComponent(webPath).replace(/%2F/gi, '/')}`;
  }

  private _getPersonName(value: ISharePointItem['Signataire1Name']): string {
    if (typeof value === 'string') {
      return value;
    }
    return value && value.Title ? value.Title : '';
  }

  private _readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error(`Impossible de lire le fichier « ${file.name} ».`));
        }
      };
      reader.onerror = () => reject(reader.error || new Error(`Impossible de lire le fichier « ${file.name} ».`));
      reader.readAsArrayBuffer(file);
    });
  }
}
