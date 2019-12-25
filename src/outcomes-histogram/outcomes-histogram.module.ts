import { outcomeHistogramLayerComponent } from './outcome-histogram-layer.component';
import angular from 'angular';
import { outcomesHistogramComponent } from './outcomes-histogram2.component';

export const outcomesHistogramModule = angular.module('outcomes-histogram', [])
  .component('outcomeHistogramLayer', outcomeHistogramLayerComponent)
  .component('outcomesHistogram', outcomesHistogramComponent)
  .name;
