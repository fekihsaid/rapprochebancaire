import * as React from 'react';
import type { IRapprocBancaireProps } from './IRapprocBancaireProps';
import { HomePage } from './pages/homePage/Home';
import { LibraryDisplay } from './pages/displayLibraries/LibraryDisplay';
import { POLES } from './pages/displayLibraries/services/configuration';
import type { PoleKey } from './pages/displayLibraries/services/models';

export default class RapprocBancaire extends React.Component<IRapprocBancaireProps> {
  public state: { selectedPole?: PoleKey } = {};

  public render(): React.ReactElement<IRapprocBancaireProps> {
    const { siteAbsoluteUrl, dataService } = this.props;
    const { selectedPole } = this.state;

    return (
      <div>
        {selectedPole ? (
          <LibraryDisplay
            pole={selectedPole}
            poleName={POLES[selectedPole].label}
            siteAbsoluteUrl={siteAbsoluteUrl}
            dataService={dataService}
            onBack={() => this.setState({ selectedPole: undefined })}
          />
        ) : (
          <HomePage
            siteAbsoluteUrl={siteAbsoluteUrl}
            onSelectPole={pole => this.setState({ selectedPole: pole })}
          />
        )}
      </div>
    );
  }
}
