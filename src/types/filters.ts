export type FilterType = 
  | 'DISTANCE_LE'
  | 'DIRECTION'
  | 'STATUS'
  | 'TRAFFIC_LIGHT'
  | 'ALERT_ZONE'
  | 'TP_HIT'
  | 'LEVERAGE_GE'
  | 'RR_GE'
  | 'HAS_DCA'
  | 'PERF_24H'
  | 'CATEGORY';

export interface ActiveFilterRule {
  id: string;
  type: FilterType;
  label: string;
  displayValue: string;
  value: any;
}
