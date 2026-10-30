import type { IRapprochementService } from './pages/displayLibraries/services/IRapprochementService';

export interface IRapprocBancaireProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  userDisplayName: string;
  siteAbsoluteUrl: string;
  dataService: IRapprochementService;
}
