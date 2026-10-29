import * as React from 'react';
import type { IRapprocBancaireProps } from './IRapprocBancaireProps';
import { HomePage } from './pages/homePage/Home';
import { HorizontalNavBar } from './pages/displayLibraries/HorizontalNavBar';

export default class RapprocBancaire extends React.Component<IRapprocBancaireProps> {
  public render(): React.ReactElement<IRapprocBancaireProps> {
    const { siteAbsoluteUrl } = this.props;

    return (
      <div style={{backgroundColor: '#faf9f7'}}>
      <HomePage siteAbsoluteUrl={siteAbsoluteUrl}/>
      <HorizontalNavBar/>
      </div>
    );
  }
}
