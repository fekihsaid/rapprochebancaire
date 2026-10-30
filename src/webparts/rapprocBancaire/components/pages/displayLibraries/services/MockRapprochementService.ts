import type { IRapprochementService } from './IRapprochementService';
import type {
  IChoiceMatrixEntry,
  INewRapprochement,
  IRapprochement,
  IRapprochementUpdate,
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
      description: item.description || ''
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
