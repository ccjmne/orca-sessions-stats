import ng from 'angular';

import { statsDetailsComponent } from './stats-details/stats-details.component';
import { populationDiscriminatorComponent } from './population-discriminator/population-discriminator.component';
import { sessionTypeSelectorComponent } from './session-type-selector/session-type-selector.component';
import { outcomeSelectorComponent } from './outcome-selector/outcome-selector.component';
import { histogramDatesFilterComponent } from './histogram-dates-filter/histogram-dates-filter.component';
import { barchartInstructorsComponent } from './barchart-instructors/barchart-instructors.component';
import { outcomePieComponent } from './outcome-pie/outcome-pie.component';

export default ng.module('orca:session-stats', [])
  .component('statsDetails', statsDetailsComponent)
  .component('populationDiscriminator', populationDiscriminatorComponent)
  .component('sessionTypeSelector', sessionTypeSelectorComponent)
  .component('outcomeSelector', outcomeSelectorComponent)
  .component('histogramDatesFilter', histogramDatesFilterComponent)
  .component('barchartInstructors', barchartInstructorsComponent)
  .component('outcomePie', outcomePieComponent)
  .name;
