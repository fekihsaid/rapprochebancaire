import type {
  IChoiceMatrixEntry,
  INewRapprochement,
  IUserAccess,
  IRapprochement,
  IRapprochementUpdate,
  PoleKey,
  RapprochementPeriod
} from './models';

export interface IRapprochementService {
  getUserAccess(pole: PoleKey): Promise<IUserAccess>;
  getRapprochements(pole: PoleKey, period: RapprochementPeriod): Promise<IRapprochement[]>;
  getChoiceMatrix(pole: PoleKey): Promise<IChoiceMatrixEntry[]>;
  createRapprochement(pole: PoleKey, item: INewRapprochement): Promise<number>;
  updateRapprochement(pole: PoleKey, itemId: number, changes: IRapprochementUpdate): Promise<void>;
  addAttachment(pole: PoleKey, itemId: number, file: File): Promise<void>;
}
