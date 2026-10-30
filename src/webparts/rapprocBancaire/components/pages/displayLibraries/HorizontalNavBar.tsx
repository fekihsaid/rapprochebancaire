import { Pivot, PivotItem } from '@fluentui/react';
import * as React from 'react';
import styles from './HorizontalNavBar.module.scss';
import type { RapprochementPeriod } from './services/models';

interface IHorizontalNavBarProps {
  selectedPeriod: RapprochementPeriod;
  onPeriodChange: (period: RapprochementPeriod) => void;
}

export const HorizontalNavBar: React.FC<IHorizontalNavBarProps> = ({ selectedPeriod, onPeriodChange }) => {
  const handleLinkClick = (item?: PivotItem): void => {
    const itemKey = item?.props.itemKey;
    if (itemKey === 'mensuel' || itemKey === 'trimestriel' || itemKey === 'archivage') {
      onPeriodChange(itemKey);
    }
  };

  return (
    <Pivot className={styles.navigation} selectedKey={selectedPeriod} onLinkClick={handleLinkClick}>
      <PivotItem headerText="MENSUEL" itemKey="mensuel" />
      <PivotItem headerText="TRIMESTRIEL" itemKey="trimestriel" />
      <PivotItem headerText="ARCHIVAGE" itemKey="archivage" />
    </Pivot>
  );
};