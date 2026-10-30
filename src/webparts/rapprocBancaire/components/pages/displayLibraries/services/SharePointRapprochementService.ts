import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import {
  POLES,
  POLE_GROUPS,
  SHAREPOINT_ASSIGNED_SIGNER_FIELDS,
  SHAREPOINT_FIELDS,
  SHAREPOINT_LISTS,
  SHAREPOINT_SECOND_PASS_FIELDS,
  SHAREPOINT_WORKFLOW_FIELDS
} from './configuration';
import type { IRapprochementService } from './IRapprochementService';
import type {
  IChoiceMatrixEntry,
  INewRapprochement,
  IRapprochement,
  IRapprochementUpdate,
  PoleKey,
  RapprochementPeriod,
  IUserAccess,
  UserRole
} from './models';

interface ISharePointUserGroup {
  Title: string;
}

interface ISharePointUser {
  Id?: number;
  Groups?: {
    results?: ISharePointUserGroup[];
  } | {
    value?: ISharePointUserGroup[];
  };
}

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

  public async getUserAccess(pole: PoleKey): Promise<IUserAccess> {
    const userUrl = `${this._getWebUrl(pole)}/_api/web/currentuser?$select=Id&$expand=Groups`;
    const response = await this._httpClient.get(
      encodeURI(userUrl),
      SPHttpClient.configurations.v1,
      { headers: { Accept: 'application/json;odata=verbose' } }
    );
    const result = await this._readJson<{ d?: ISharePointUser } & ISharePointUser>(response);
    const user = result.d || result;
    const groups = user.Groups;
    const userGroups = groups && 'results' in groups
      ? groups.results || []
      : groups && 'value' in groups
        ? groups.value || []
        : [];
    const memberGroupNames = new Set(
      userGroups.map(group => group.Title)
    );
    const groupConfiguration = POLE_GROUPS[pole];
    const roles = (Object.keys(groupConfiguration) as UserRole[])
      .filter(role => memberGroupNames.has(groupConfiguration[role]));
    const isAdmin = roles.indexOf('admin') !== -1;
    const canManageWorkflow = roles.indexOf('signataire1') !== -1 || roles.indexOf('signataire2') !== -1;

    return {
      roles,
      canView: roles.length > 0,
      canCreate: roles.indexOf('emetteur') !== -1,
      canEdit: roles.indexOf('emetteur') !== -1 || isAdmin || canManageWorkflow,
      canManageWorkflow,
      currentUserId: user.Id
    };
  }

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
      `${SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer1}/Title`,
      `${SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer2}/Title`,
      `${SHAREPOINT_WORKFLOW_FIELDS.emitter}/Title`,
      `${SHAREPOINT_SECOND_PASS_FIELDS.emitter}/Title`,
      `${SHAREPOINT_SECOND_PASS_FIELDS.signer1}/Title`,
      `${SHAREPOINT_SECOND_PASS_FIELDS.signer2}/Title`,
      `${SHAREPOINT_WORKFLOW_FIELDS.beingAnalysedBy}/Title`,
      SHAREPOINT_FIELDS.period,
      SHAREPOINT_FIELDS.description,
      SHAREPOINT_WORKFLOW_FIELDS.emissionDate,
      SHAREPOINT_WORKFLOW_FIELDS.signatureDate1,
      SHAREPOINT_WORKFLOW_FIELDS.signatureDate2,
      SHAREPOINT_WORKFLOW_FIELDS.emitterComment,
      SHAREPOINT_WORKFLOW_FIELDS.signer1Comment,
      SHAREPOINT_WORKFLOW_FIELDS.signer2Comment,
      SHAREPOINT_WORKFLOW_FIELDS.refusalReason1,
      SHAREPOINT_WORKFLOW_FIELDS.refusalReason2,
      SHAREPOINT_WORKFLOW_FIELDS.refusalComment1,
      SHAREPOINT_WORKFLOW_FIELDS.refusalComment2,
      SHAREPOINT_WORKFLOW_FIELDS.secondPass,
      SHAREPOINT_SECOND_PASS_FIELDS.emissionDate,
      SHAREPOINT_SECOND_PASS_FIELDS.signatureDate1,
      SHAREPOINT_SECOND_PASS_FIELDS.signatureDate2,
      SHAREPOINT_SECOND_PASS_FIELDS.emitterComment,
      SHAREPOINT_SECOND_PASS_FIELDS.signer1Comment,
      SHAREPOINT_SECOND_PASS_FIELDS.signer2Comment,
      SHAREPOINT_SECOND_PASS_FIELDS.refusalReason1,
      SHAREPOINT_SECOND_PASS_FIELDS.refusalReason2,
      SHAREPOINT_SECOND_PASS_FIELDS.refusalComment1,
      SHAREPOINT_SECOND_PASS_FIELDS.refusalComment2
    ].join(',');
    const expand = [
      SHAREPOINT_FIELDS.signer1,
      SHAREPOINT_FIELDS.signer2,
      SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer1,
      SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer2,
      SHAREPOINT_WORKFLOW_FIELDS.emitter,
      SHAREPOINT_SECOND_PASS_FIELDS.emitter,
      SHAREPOINT_SECOND_PASS_FIELDS.signer1,
      SHAREPOINT_SECOND_PASS_FIELDS.signer2,
      SHAREPOINT_WORKFLOW_FIELDS.beingAnalysedBy
    ].join(',');
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
      description: item[SHAREPOINT_FIELDS.description] || '',
      emitter: this._getPersonName(item[SHAREPOINT_WORKFLOW_FIELDS.emitter]),
      signer1Assigned: this._getPersonName(item[SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer1]),
      signer2Assigned: this._getPersonName(item[SHAREPOINT_ASSIGNED_SIGNER_FIELDS.signer2]),
      beingAnalysedBy: this._getPersonName(item[SHAREPOINT_WORKFLOW_FIELDS.beingAnalysedBy]),
      emissionDate: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.emissionDate]),
      signatureDate1: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.signatureDate1]),
      signatureDate2: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.signatureDate2]),
      emitterComment: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.emitterComment]),
      signer1Comment: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.signer1Comment]),
      signer2Comment: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.signer2Comment]),
      refusalReason1: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.refusalReason1]),
      refusalReason2: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.refusalReason2]),
      refusalComment1: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.refusalComment1]),
      refusalComment2: this._getString(item[SHAREPOINT_WORKFLOW_FIELDS.refusalComment2]),
      emitterBis: this._getPersonName(item[SHAREPOINT_SECOND_PASS_FIELDS.emitter]),
      signer1Bis: this._getPersonName(item[SHAREPOINT_SECOND_PASS_FIELDS.signer1]),
      signer2Bis: this._getPersonName(item[SHAREPOINT_SECOND_PASS_FIELDS.signer2]),
      emissionDateBis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.emissionDate]),
      signatureDate1Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.signatureDate1]),
      signatureDate2Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.signatureDate2]),
      emitterCommentBis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.emitterComment]),
      signer1CommentBis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.signer1Comment]),
      signer2CommentBis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.signer2Comment]),
      refusalReason1Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.refusalReason1]),
      refusalReason2Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.refusalReason2]),
      refusalComment1Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.refusalComment1]),
      refusalComment2Bis: this._getString(item[SHAREPOINT_SECOND_PASS_FIELDS.refusalComment2]),
      secondPass: Boolean(item[SHAREPOINT_WORKFLOW_FIELDS.secondPass])
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
    item: IRapprochementUpdate
    // SharePoint REST payloads allow null to clear a Person field.
    // eslint-disable-next-line @rushstack/no-new-null
  ): { __metadata: { type: string }; [key: string]: string | number | boolean | null | { type: string } } {
    // eslint-disable-next-line @rushstack/no-new-null
    const payload: { __metadata: { type: string }; [key: string]: string | number | boolean | null | { type: string } } = {
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
    const secondPassFields = item.useSecondPassFields ? SHAREPOINT_SECOND_PASS_FIELDS : undefined;
    if (item.signer1Id !== undefined) {
      payload[`${secondPassFields ? secondPassFields.signer1 : SHAREPOINT_FIELDS.signer1}Id`] = item.signer1Id;
    }
    if (item.signer2Id !== undefined) {
      payload[`${secondPassFields ? secondPassFields.signer2 : SHAREPOINT_FIELDS.signer2}Id`] = item.signer2Id;
    }
    if (item.emitterId !== undefined) {
      payload[`${secondPassFields ? secondPassFields.emitter : SHAREPOINT_WORKFLOW_FIELDS.emitter}Id`] = item.emitterId;
    }
    if (item.beingAnalysedById !== undefined) {
      payload[`${SHAREPOINT_WORKFLOW_FIELDS.beingAnalysedBy}Id`] = item.beingAnalysedById;
    }
    if (item.emissionDate !== undefined) {
      payload[secondPassFields ? secondPassFields.emissionDate : SHAREPOINT_WORKFLOW_FIELDS.emissionDate] = item.emissionDate;
    }
    if (item.signatureDate1 !== undefined) {
      payload[secondPassFields ? secondPassFields.signatureDate1 : SHAREPOINT_WORKFLOW_FIELDS.signatureDate1] = item.signatureDate1;
    }
    if (item.signatureDate2 !== undefined) {
      payload[secondPassFields ? secondPassFields.signatureDate2 : SHAREPOINT_WORKFLOW_FIELDS.signatureDate2] = item.signatureDate2;
    }
    if (item.emitterComment !== undefined) {
      payload[secondPassFields ? secondPassFields.emitterComment : SHAREPOINT_WORKFLOW_FIELDS.emitterComment] = item.emitterComment;
    }
    if (item.signer1Comment !== undefined) {
      payload[secondPassFields ? secondPassFields.signer1Comment : SHAREPOINT_WORKFLOW_FIELDS.signer1Comment] = item.signer1Comment;
    }
    if (item.signer2Comment !== undefined) {
      payload[secondPassFields ? secondPassFields.signer2Comment : SHAREPOINT_WORKFLOW_FIELDS.signer2Comment] = item.signer2Comment;
    }
    if (item.refusalReason1 !== undefined) {
      payload[secondPassFields ? secondPassFields.refusalReason1 : SHAREPOINT_WORKFLOW_FIELDS.refusalReason1] = item.refusalReason1;
    }
    if (item.refusalReason2 !== undefined) {
      payload[secondPassFields ? secondPassFields.refusalReason2 : SHAREPOINT_WORKFLOW_FIELDS.refusalReason2] = item.refusalReason2;
    }
    if (item.refusalComment1 !== undefined) {
      payload[secondPassFields ? secondPassFields.refusalComment1 : SHAREPOINT_WORKFLOW_FIELDS.refusalComment1] = item.refusalComment1;
    }
    if (item.refusalComment2 !== undefined) {
      payload[secondPassFields ? secondPassFields.refusalComment2 : SHAREPOINT_WORKFLOW_FIELDS.refusalComment2] = item.refusalComment2;
    }
    if (item.secondPass !== undefined) { payload[SHAREPOINT_WORKFLOW_FIELDS.secondPass] = item.secondPass; }
    return payload;
  }

  private _getWebUrl(pole: PoleKey): string {
    const webPath = POLES[pole].webPath;
    return `${this._rootSiteAbsoluteUrl.replace(/\/$/, '')}/${encodeURIComponent(webPath).replace(/%2F/gi, '/')}`;
  }

  private _getPersonName(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'Title' in value && typeof value.Title === 'string') {
      return value.Title;
    }
    return '';
  }

  private _getString(value: unknown): string {
    return typeof value === 'string' ? value : '';
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
