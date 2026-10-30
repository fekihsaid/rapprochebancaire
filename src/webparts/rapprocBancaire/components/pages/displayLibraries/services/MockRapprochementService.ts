import type { IRapprochementService } from './IRapprochementService';
import type {
  IChoiceMatrixEntry,
  INewRapprochement,
  IRapprochement,
  IRapprochementUpdate,
  IUserAccess,
  PoleKey,
  RapprochementPeriod
} from './models';
import { mockRapprochements } from '../test/mockRapprochements';

const mockChoiceMatrix: IChoiceMatrixEntry[] = [
  { genre: 'Banque', company: 'H005 - FONDATION', account: '51201001 - BNP AUGER Hoche' },
  { genre: 'Banque', company: 'H005 - FONDATION', account: '51201002 - BNP 002' },
  { genre: 'Caisse', company: 'H005 - FONDATION', account: '53000000 - Caisse' },
  { genre: 'Carte', company: 'H005 - FONDATION', account: '51100000 - Carte bancaire' }
];

export class MockRapprochementService implements IRapprochementService {
  private readonly _items: IRapprochement[] = mockRapprochements.map(item => ({ ...item }));
  private _nextId: number = Math.max(0, ...this._items.map(item => item.id)) + 1;

  public async getUserAccess(_pole: PoleKey): Promise<IUserAccess> {
    return {
      roles: ['emetteur'],
      canView: true,
      canCreate: true,
      canEdit: true,
      canManageWorkflow: false,
      currentUserId: 1
    };
  }

  public async getRapprochements(_pole: PoleKey, period: RapprochementPeriod): Promise<IRapprochement[]> {
    return this._items
      .filter(item => item.period === period)
      .map(item => ({ ...item }));
  }

  public async getChoiceMatrix(_pole: PoleKey): Promise<IChoiceMatrixEntry[]> {
    return mockChoiceMatrix.map(item => ({ ...item }));
  }

  public async createRapprochement(_pole: PoleKey, item: INewRapprochement): Promise<number> {
    const id = this._nextId++;
    this._items.push({
      id,
      title: item.title,
      month: item.month,
      year: item.year,
      account: item.account,
      company: item.company,
      genre: item.genre,
      status: item.status,
      signer1: '',
      signer2: '',
      period: item.period,
      description: item.description || '',
      secondPass: false
    });
    return id;
  }

  public async updateRapprochement(_pole: PoleKey, itemId: number, changes: IRapprochementUpdate): Promise<void> {
    const item = this._items.find(rapprochement => rapprochement.id === itemId);
    if (!item) {
      throw new Error(`Le rapprochement fictif ${itemId} n'existe pas.`);
    }

    item.title = changes.title === undefined ? item.title : changes.title;
    item.month = changes.month === undefined ? item.month : changes.month;
    item.year = changes.year === undefined ? item.year : changes.year;
    item.account = changes.account === undefined ? item.account : changes.account;
    item.company = changes.company === undefined ? item.company : changes.company;
    item.genre = changes.genre === undefined ? item.genre : changes.genre;
    item.status = changes.status === undefined ? item.status : changes.status;
    item.period = changes.period === undefined ? item.period : changes.period;
    item.description = changes.description === undefined ? item.description : changes.description;
    const isSecondPass = Boolean(changes.useSecondPassFields);
    if (changes.emitterId !== undefined) {
      if (isSecondPass) { item.emitterBis = 'Utilisateur fictif'; }
      else { item.emitter = 'Utilisateur fictif'; }
    }
    if (changes.signer1Id !== undefined) {
      if (isSecondPass) { item.signer1Bis = 'Utilisateur fictif'; }
      else { item.signer1 = 'Utilisateur fictif'; }
    }
    if (changes.signer2Id !== undefined) {
      if (isSecondPass) { item.signer2Bis = 'Utilisateur fictif'; }
      else { item.signer2 = 'Utilisateur fictif'; }
    }
    item.beingAnalysedBy = changes.beingAnalysedById === undefined
      ? item.beingAnalysedBy
      : changes.beingAnalysedById === null ? '' : 'Utilisateur fictif';
    if (isSecondPass) {
      item.emissionDateBis = changes.emissionDate === undefined ? item.emissionDateBis : changes.emissionDate;
      item.signatureDate1Bis = changes.signatureDate1 === undefined ? item.signatureDate1Bis : changes.signatureDate1;
      item.signatureDate2Bis = changes.signatureDate2 === undefined ? item.signatureDate2Bis : changes.signatureDate2;
      item.emitterCommentBis = changes.emitterComment === undefined ? item.emitterCommentBis : changes.emitterComment;
      item.signer1CommentBis = changes.signer1Comment === undefined ? item.signer1CommentBis : changes.signer1Comment;
      item.signer2CommentBis = changes.signer2Comment === undefined ? item.signer2CommentBis : changes.signer2Comment;
      item.refusalReason1Bis = changes.refusalReason1 === undefined ? item.refusalReason1Bis : changes.refusalReason1;
      item.refusalReason2Bis = changes.refusalReason2 === undefined ? item.refusalReason2Bis : changes.refusalReason2;
      item.refusalComment1Bis = changes.refusalComment1 === undefined ? item.refusalComment1Bis : changes.refusalComment1;
      item.refusalComment2Bis = changes.refusalComment2 === undefined ? item.refusalComment2Bis : changes.refusalComment2;
    } else {
      item.emissionDate = changes.emissionDate === undefined ? item.emissionDate : changes.emissionDate;
      item.signatureDate1 = changes.signatureDate1 === undefined ? item.signatureDate1 : changes.signatureDate1;
      item.signatureDate2 = changes.signatureDate2 === undefined ? item.signatureDate2 : changes.signatureDate2;
      item.emitterComment = changes.emitterComment === undefined ? item.emitterComment : changes.emitterComment;
      item.signer1Comment = changes.signer1Comment === undefined ? item.signer1Comment : changes.signer1Comment;
      item.signer2Comment = changes.signer2Comment === undefined ? item.signer2Comment : changes.signer2Comment;
      item.refusalReason1 = changes.refusalReason1 === undefined ? item.refusalReason1 : changes.refusalReason1;
      item.refusalReason2 = changes.refusalReason2 === undefined ? item.refusalReason2 : changes.refusalReason2;
      item.refusalComment1 = changes.refusalComment1 === undefined ? item.refusalComment1 : changes.refusalComment1;
      item.refusalComment2 = changes.refusalComment2 === undefined ? item.refusalComment2 : changes.refusalComment2;
    }
    item.secondPass = changes.secondPass === undefined ? item.secondPass : changes.secondPass;
  }

  public async addAttachment(_pole: PoleKey, itemId: number, file: File): Promise<void> {
    if (!this._items.some(item => item.id === itemId)) {
      throw new Error(`Le rapprochement fictif ${itemId} n'existe pas.`);
    }

    if (file.size === 0) {
      throw new Error('Le fichier joint est vide.');
    }
  }
}
