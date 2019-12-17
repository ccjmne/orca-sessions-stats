import { IComponentOptions, IComponentController } from 'angular';

import crossfilter from 'crossfilter2';
import dc from 'dc';

import { json, scaleOrdinal, scaleLinear, scaleBand } from 'd3';
export interface Record {
  empl_gender: boolean;
  empl_permanent: boolean;
  trem_outcome: string; // TODO: 'VALIDATED' | 'CANCELLED' | ...
  trng_trty_fk: number;
  array_agg: number[];
}

export const dcDashboardComponent: IComponentOptions = {
  template: require('./dc-dashboard.component.html'),
  controllerAs: '$ctrl',
  controller: class DCDashboardComponent implements IComponentController {
    private stats: Array<Record>;

    constructor() {
    }

    public async $onInit(): Promise<void> {
      this.stats = await json('./assets/records.json') as unknown as Array<Record>;
      this.stats = this.stats.filter(({ trem_outcome: outcome }) => ['VALIDATED', 'FLUNKED', 'MISSING'].includes(outcome));
      const universe = crossfilter(this.stats);

      window.cf = universe;

      const genders = universe.dimension(({ empl_gender }) => empl_gender);
      const statuses = universe.dimension(({ empl_permanent }) => empl_permanent);
      const outcomes = universe.dimension(({ trem_outcome }) => trem_outcome);
      const instructors = (universe.dimension)(({ array_agg }) => array_agg, true);

      const gendersGroup = genders.group();
      const statusesGroup = statuses.group();
      const outcomesGroup = outcomes.group();
      const instructorsGroup = instructors.group();

      // console.log((dc as unknown as () => any)())

      const gendersChart = dc.pieChart('#genders').dimension(genders).group(gendersGroup)
        .label(d => `${d.key ? 'Hommes' : 'Femmes'}: ${d.value}`)
        .ordering(({ key }) => key)
        ;
      const statusesChart = dc.pieChart('#statuses').dimension(statuses).group(statusesGroup)
        .label(d => `${d.key ? 'CDI' : 'CDD'}: ${d.value}`)
        .ordering(({ key }) => key)
        ;

      const translateOutcomes = {
        VALIDATED: 'Validé(s)',
        FLUNKED: 'Recalé(s)',
        MISSING: 'Absent(s)'
      };

      const outcomesOrders = [`VALIDATED`, 'FLUNKED', 'MISSING'];

      // const outcomesChart = dc.pieChart('#outcomes').dimension(outcomes).group(outcomesGroup);
      const asdf = dc.pieChart('#outcomes')
        .dimension(outcomes)
        .ordering(({ key }) => outcomesOrders.indexOf(key))
        .group(outcomesGroup)
        .label(d => `${translateOutcomes[d.key]} : ${d.value}`)
        .legend(dc.legend().x(400).y(10).itemHeight(13).gap(5))
        // .groupAll(*)(outcomes.group(d => d === 'VALIDATED'))
        ;

      // asdf.stack(outcomes.group(d => d === 'FLUNKED'));
      // asdf.stack(outcomes.group(d => d === 'MISSING'));


      dc.rowChart('#instructors')
        .dimension(instructors)
        // .y(scaleBand())//.domain(['VALIDATED', 'FLUNKED', 'ABSENT', 'PENDING', 'CANCELLED']))
        // .brushOn(false)
        // .xUnits(dc.units.ordinal)
        // .elasticX(true)
        // .elasticY(true)
        // .renderHorizontalGridLines(true)
        .group(instructorsGroup)
        .renderLabel(true)
        .height(1000)
        .width(250)
        // .dimension(topicsDim)
        // .group(topicsGroup)
        // .cap(3)
        .ordering(d => -d.value)
        .xAxis().ticks(3)
        ;
      // dc.barChart('#instructors').dimension(instructors).group(instructorsGroup).x(scaleOrdinal()).elasticX();

      dc.renderAll();
    }
  }
};
