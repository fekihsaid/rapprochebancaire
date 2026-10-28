import * as React from 'react';
import styles from './RapprocBancaire.module.scss';
import type { IRapprocBancaireProps } from './IRapprocBancaireProps';

export default class RapprocBancaire extends React.Component<IRapprocBancaireProps> {
  public render(): React.ReactElement<IRapprocBancaireProps> {
    const { siteAbsoluteUrl } = this.props;

    return (
      <section className={styles.rapprocBancaire}>
        <div className={styles.banner} aria-hidden="true" />
        <h1 className={styles.title}>LISTE DES PÔLES</h1>
        <div className={styles.siteTiles} role="group" aria-label="Liste des pôles">
          <a className={styles.siteTile} href={`${siteAbsoluteUrl}/Sellier/Lists/Rapprochements/AllItems.aspx`}>
            <span className={styles.tileImageContainer}>
              <img
                className={styles.tileImage}
                src={`${siteAbsoluteUrl}/SiteAssets/UsefullLinks/MG_9385_2015_Alexis_Goure_Photographe_Rogn%C3%A9.png`}
                alt=""
              />
            </span>
            <span className={styles.tileLabel}>Pôle Sellier</span>
          </a>
          <a className={styles.siteTile} href={`${siteAbsoluteUrl}/SocietesSoeurs/Lists/Rapprochements/AllItems.aspx`}>
            <span className={styles.tileImageContainer}>
              <img
                className={styles.tileImage}
                src={`${siteAbsoluteUrl}/SiteAssets/UsefullLinks/P_43_Colorblock.png`}
                alt=""
              />
            </span>
            <span className={styles.tileLabel}>Pôle Sociétés Sœurs</span>
          </a>
        </div>
      </section>
    );
  }
}
