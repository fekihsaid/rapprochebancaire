import { Pivot, PivotItem } from "@fluentui/react"
import * as React from 'react';
export const HorizontalNavBar: React.FC= () => {
    return(
<Pivot selectedKey="mensuel">
  <PivotItem headerText="MENSUEL" itemKey="mensuel" />
  <PivotItem headerText="TRIMESTRIEL" itemKey="trimestriel" />
  <PivotItem headerText="ARCHIVAGE" itemKey="archivage" />
</Pivot>)
}